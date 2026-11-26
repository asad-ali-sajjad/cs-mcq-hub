(function () {
  const CFG = window.SITE_CONFIG || {};
  const storage = CFG.storage || {};
  const themeKey = storage.themeKey || "cs_mcq_hub_theme";
  const themeBtn = document.getElementById("themeBtn");

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

  function applyTheme(theme) {
    const isDark = theme === "dark";
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    if (themeBtn) {
      themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
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