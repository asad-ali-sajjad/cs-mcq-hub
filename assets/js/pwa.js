/* ==========================================================================
   ReviseLoop — file://-Safe PWA Bootstrap
   ========================================================================== */

(function () {
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const isHttpContext =
    protocol === "https:" ||
    (protocol === "http:" && (host === "localhost" || host === "127.0.0.1"));

  if (!isHttpContext) return;

  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "manifest.webmanifest";
    document.head.appendChild(link);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();