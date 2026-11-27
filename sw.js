/* ==========================================================================
   ReviseLoop — Offline Service Worker (Network-First with Cache Fallback)
   ========================================================================== */

const CACHE_NAME = "reviseloop-shell-v2";
const PROJECT_CACHE_PREFIXES = ["reviseloop-", "cs-mcq-hub-"];
const NETWORK_TIMEOUT_MS = 3000;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./quiz.html",
  "./coming-soon.html",
  "./manifest.webmanifest",
  "./assets/css/global.css",
  "./assets/css/home.css",
  "./assets/css/quiz.css",
  "./assets/css/coming-soon.css",
  "./assets/js/config.js",
  "./assets/js/theme.js",
  "./assets/js/subjects-data.js",
  "./assets/js/home.js",
  "./assets/js/landing.js",
  "./assets/js/quiz-engine.js",
  "./assets/js/coming-soon.js",
  "./assets/js/pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        // "reload" skips the browser's HTTP cache
        CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" })))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME &&
                PROJECT_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === "navigate";
  // Store one copy per page, whatever its ?subject= value
  const cacheKey = isPage ? url.origin + url.pathname : req;

  // "no-cache" checks with the server before reusing an HTTP-cached file
  const network = fetch(req, { cache: "no-cache" });

  // Save in the background, even if the timeout has already used the cache
  const saved = network
    .then((res) => {
      if (!res.ok) return;
      const copy = res.clone();
      return caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
    })
    .catch(() => {});
  event.waitUntil(saved);

  event.respondWith(networkFirst(network, cacheKey, isPage));
});

async function networkFirst(network, cacheKey, isPage) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey, { ignoreSearch: isPage });

  if (!cached) {
    try {
      return await network;
    } catch (err) {
      const home = isPage ? await cache.match("./index.html") : null;
      return home || Response.error();
    }
  }

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS);
  });

  const fresh = network
    .then((res) => (res.status >= 500 ? cached : res))
    .catch(() => cached);

  const result = await Promise.race([fresh, timeout]);
  clearTimeout(timer);
  return result;
}
