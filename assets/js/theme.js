(function () {
    const CFG = window.SITE_CONFIG || {};
    const storage = CFG.storage || {};
    const themeKey = storage.themeKey || "theme";
    const themeBtn = document.getElementById("themeBtn");

    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            if (themeBtn) themeBtn.textContent = "☀️ Light";
        } else {
            document.documentElement.removeAttribute("data-theme");
            if (themeBtn) themeBtn.textContent = "🌙 Dark";
        }
    }

    // Initialize saved theme immediately
    const savedTheme = localStorage.getItem(themeKey) || localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            const nextTheme = isDark ? "light" : "dark";
            localStorage.setItem(themeKey, nextTheme);
            applyTheme(nextTheme);
        });
    }
})();