/* ==========================================================================
   ReviseLoop — Persistent Light / Dark Theme Switcher
   ========================================================================== */

(function () {
  const CFG = window.SITE_CONFIG || {};
  const storage = CFG.storage || {};
  const themeKey = storage.themeKey || "reviseloop_theme";
  const themeBtn = document.getElementById("themeBtn");

  const MOON_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  const SUN_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

  function readSavedTheme() {
    try {
      return localStorage.getItem(themeKey) || localStorage.getItem("theme") || "light";
    } catch (err) {
      return "light";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(themeKey, theme);
    } catch (err) {
      // Ignore storage quota or private-mode errors
    }
  }

  function syncThemeColorMeta(isDark) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isDark ? "#0b1120" : "#3b5bdb");
    }
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    syncThemeColorMeta(isDark);

    if (themeBtn) {
      themeBtn.innerHTML = isDark
        ? `${SUN_ICON}<span>Light</span>`
        : `${MOON_ICON}<span>Dark</span>`;
      themeBtn.setAttribute("aria-pressed", String(isDark));
      themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  applyTheme(readSavedTheme());

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const nextTheme = isDark ? "light" : "dark";
      saveTheme(nextTheme);
      applyTheme(nextTheme);
    });
  }
})();