/* ==========================================================================
   ReviseLoop — Central Site Configuration & DOM Hydration
   Loaded synchronously before page scripts so all views share one source of truth.
   ========================================================================== */

(function () {
  const SITE_CONFIG = {
    brand: {
      name: "ReviseLoop",
      logoPrefix: "Revise",
      logoAccent: "Loop",
      tagline: "Close the gap between studying and knowing.",
      metaDescription:
        "An offline-capable MCQ practice and exam revision workspace with mock exams, mistake review, and progress tracking.",
      footerTagline:
        "An offline-capable MCQ practice and exam revision workspace built for focused active recall.",
      quizFooterTagline:
        "Focused MCQ practice, mock exams, and active-recall revision.",
      copyrightLine: "© 2026 ReviseLoop • Offline-capable study workspace"
    },
    author: {
      name: "asad-ali-sajjad",
      githubUrl: "https://github.com/asad-ali-sajjad"
    },
    links: {
      repoUrl: "https://github.com/asad-ali-sajjad/reviseloop",
      liveUrl: "https://asad-ali-sajjad.github.io/reviseloop/",
      issuesUrl: "https://github.com/asad-ali-sajjad/reviseloop/issues"
    },
    storage: {
      prefix: "reviseloop_",
      version: "v1",
      themeKey: "reviseloop_theme"
    },
    catalog: {
      defaultTrack: "Active Track",
      defaultStatusReady: "Exam Prep",
      defaultStatusUpcoming: "Coming Soon",
      tracks: [
        { id: "Active Track", role: "active", label: "⚡ Active Track" },
        { id: "Electives", role: "electives", label: "🚀 Electives" },
        { id: "Core CS", role: "core", label: "📚 Core CS" },
        { id: "All", role: "all", label: "All Subjects" }
      ]
    },
    quizDefaults: {
      fallbackSubjectId: "pdc",
      fallbackCourseCode: "BANK",
      fallbackTitle: "Subject Practice",
      fallbackSubtitle: "Interactive MCQ Practice & Exam Review",
      defaultPerPage: 50,
      perPageOptions: [50, 100, 9999],
      defaultMockCount: 25,
      mockCountOptions: [10, 25, 50, 100],
      undoToastDurationMs: 6000,
      maxUploadSizeMB: 10
    }
  };

  window.SITE_CONFIG = SITE_CONFIG;

  function resolveConfigPath(path) {
    if (!path) return undefined;
    return String(path)
      .split(".")
      .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), SITE_CONFIG);
  }

  function hydrateBrandLogo(el) {
    const prefix = SITE_CONFIG.brand.logoPrefix || "Revise";
    const accent = SITE_CONFIG.brand.logoAccent || "Loop";
    el.innerHTML =
      `<span class="logo-mark" aria-hidden="true">` +
        `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">` +
          `<path d="M21 12a9 9 0 1 1-3.2-6.9"/>` +
          `<path d="M21 3v6h-6"/>` +
        `</svg>` +
      `</span>` +
      `<span>${prefix}<span class="logo-accent">${accent}</span></span>`;
  }

  function hydrateDomFromConfig() {
    document.querySelectorAll("[data-config-text]").forEach((el) => {
      const val = resolveConfigPath(el.getAttribute("data-config-text"));
      if (val !== undefined && val !== null) {
        el.textContent = String(val);
      }
    });

    document.querySelectorAll("[data-config-html]").forEach((el) => {
      const val = resolveConfigPath(el.getAttribute("data-config-html"));
      if (val !== undefined && val !== null) {
        el.innerHTML = String(val);
      }
    });

    document.querySelectorAll("[data-config-href]").forEach((el) => {
      const val = resolveConfigPath(el.getAttribute("data-config-href"));
      if (val !== undefined && val !== null) {
        el.setAttribute("href", String(val));
      }
    });

    document.querySelectorAll("[data-config-meta-description]").forEach((el) => {
      const val = resolveConfigPath(el.getAttribute("data-config-meta-description"));
      if (val !== undefined && val !== null) {
        el.setAttribute("content", String(val));
      }
    });

    document.querySelectorAll("[data-config-logo]").forEach(hydrateBrandLogo);

    const titleEl = document.querySelector("title[data-config-title-format]");
    if (titleEl) {
      const template = titleEl.getAttribute("data-config-title-format");
      if (template) {
        document.title = template.replace(/\{([^}]+)\}/g, (_, key) => {
          const val = resolveConfigPath(key.trim());
          return val !== undefined && val !== null ? String(val) : "";
        });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateDomFromConfig);
  } else {
    hydrateDomFromConfig();
  }
})();