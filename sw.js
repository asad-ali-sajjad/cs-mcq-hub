/* ==========================================================================
   CS MCQ Hub — Offline Service Worker (Stale-While-Revalidate)
   ========================================================================== */

const CACHE_NAME = "cs-mcq-hub-shell-v1";

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
  "./assets/js/quiz-engine.js",
  "./assets/js/coming-soon.js",
  "./assets/js/pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (e.g., quiz.html?subject=deep-learning)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // Same-origin CSS, JS, and data/*.js question banks: Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});