window.SITE_CONFIG = {
  brand: {
    name: "ReviseLoop",
    tagline: "Practise. Review. Retry.",
    logoPrefix: "Revise",
    logoSuffix: "Loop",
    metaDescription: "An offline-capable MCQ practice and exam revision workspace with mock exams, mistake review and progress tracking.",
    heroTag: "🎓 Computer Science Exam Prep",
    heroHeadline: "<span>Practise.</span> <span>Review.</span> <span>Retry.</span>",
    heroDescription: "Turn every wrong answer into your next study step. Practise MCQs, take mock exams and revisit the questions you missed.",
    footerTagline: "A focused workspace for MCQ practice, mock exams and revising your mistakes.",
    quizFooterTagline: "Focused MCQ practice, mock exams and mistake review.",
    copyrightLine: "Crafted for focused exam preparation"
  },
  links: {
    liveUrl: "https://asad-ali-sajjad.github.io/reviseloop/",
    repoUrl: "https://github.com/asad-ali-sajjad/reviseloop",
    issuesUrl: "https://github.com/asad-ali-sajjad/reviseloop/issues",
    featuredSubjects: [
      { label: "Deep Learning Bank", subjectId: "deep-learning" },
      { label: "PDC Bank", subjectId: "pdc" }
    ]
  },
  catalog: {
    defaultTrack: "Active Track",
    activeTrackStatLabel: "Active Study Track",
    tracks: [
      { id: "Active Track", role: "active", label: "⚡ Active Track" },
      { id: "Electives", role: "electives", label: "🚀 Electives" },
      { id: "Core CS", role: "core", label: "📚 Core CS" },
      { id: "All", role: "all", label: "All Subjects" }
    ],
    defaultStatusReady: "Exam Prep",
    defaultStatusUpcoming: "Coming Soon"
  },
  quizDefaults: {
    fallbackSubjectId: "pdc",
    fallbackCourseCode: "REVISELOOP",
    fallbackTitle: "ReviseLoop MCQ Practice",
    fallbackSubtitle: "Interactive MCQ Practice & Exam Review",
    defaultPerPage: 50,
    perPageOptions: [50, 100, 9999],
    defaultMockCount: 25,
    mockCountOptions: [10, 25, 50, 100],
    undoToastDurationMs: 6000,
    maxUploadSizeMB: 10
  },
  storage: {
    prefix: "reviseloop_",
    version: "v1",
    themeKey: "reviseloop_theme"
  }
};

(function () {
  const config = window.SITE_CONFIG;

  function getValue(path) {
    return path.split(".").reduce((value, key) => value && value[key], config);
  }

  function hydratePage() {
    document.querySelectorAll("[data-config-text]").forEach((el) => {
      const value = getValue(el.dataset.configText);
      if (value != null) el.textContent = value;
    });

    document.querySelectorAll("[data-config-html]").forEach((el) => {
      const value = getValue(el.dataset.configHtml);
      if (value != null) el.innerHTML = value;
    });

    document.querySelectorAll("[data-config-href]").forEach((el) => {
      const value = getValue(el.dataset.configHref);
      if (value != null) el.href = value;
    });

    document.querySelectorAll("[data-config-meta-description]").forEach((el) => {
      const value = getValue(el.dataset.configMetaDescription);
      if (value != null) el.setAttribute("content", value);
    });

    document.querySelectorAll("[data-config-logo]").forEach((el) => {
      const { name, logoPrefix, logoSuffix } = config.brand;
      el.textContent = logoPrefix || name || "";
      if (logoPrefix && logoSuffix) {
        const suffix = document.createElement("span");
        suffix.textContent = logoSuffix;
        el.appendChild(suffix);
      }
    });

    document.querySelectorAll("[data-config-featured]").forEach((el) => {
      const subject = config.links.featuredSubjects[Number(el.dataset.configFeatured)];
      if (subject) {
        el.textContent = subject.label;
        el.href = `quiz.html?subject=${encodeURIComponent(subject.subjectId)}`;
      }
    });

    document.querySelectorAll("[data-config-title-format]").forEach((el) => {
      document.title = el.dataset.configTitleFormat.replace(/\{([\w.]+)\}/g, (match, path) => {
        const value = getValue(path);
        return value == null ? match : value;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydratePage);
  } else {
    hydratePage();
  }
})();