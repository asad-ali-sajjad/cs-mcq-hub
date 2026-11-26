window.SITE_CONFIG = {
  brand: {
    name: "CS MCQ Hub",
    tagline: "Study Smarter. Revise Faster.",
    logoPrefix: "CS",
    logoSuffix: "-MCQ-HUB",
    metaDescription: "Interactive, offline-friendly MCQ practice, randomized mock exams, and active-recall review for Computer Science courses.",
    heroTag: "🚀 Interactive Exam Preparation Workspace",
    heroHeadline: "Study Smarter.<br>Revise Faster.",
    heroDescription: "Practice searchable Computer Science MCQs, timed mock exams, and active-recall reviews with local progress tracking.",
    footerTagline: "Interactive MCQ practice, randomized mock exams, and active-recall review built for Computer Science courses.",
    quizFooterTagline: "Focused MCQ practice, mock exams, and active-recall revision.",
    copyrightLine: "Crafted for focused exam preparation"
  },
  links: {
    liveUrl: "https://asad-ali-sajjad.github.io/cs-mcq-hub/",
    repoUrl: "https://github.com/asad-ali-sajjad/cs-mcq-hub",
    issuesUrl: "https://github.com/asad-ali-sajjad/cs-mcq-hub/issues",
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
    fallbackCourseCode: "CS-HUB",
    fallbackTitle: "CS MCQ Practice",
    fallbackSubtitle: "Interactive MCQ Practice & Exam Review",
    defaultPerPage: 50,
    perPageOptions: [50, 100, 9999],
    defaultMockCount: 25,
    mockCountOptions: [10, 25, 50, 100],
    undoToastDurationMs: 6000,
    maxUploadSizeMB: 10
  },
  storage: {
    prefix: "cs_mcq_hub_",
    version: "v1",
    themeKey: "cs_mcq_hub_theme"
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
      el.textContent = "";
      const name = (config.brand.name || "").trim();
      if (name) {
        const firstSpace = name.indexOf(" ");
        el.appendChild(document.createTextNode(firstSpace === -1 ? name : name.slice(0, firstSpace)));
        if (firstSpace !== -1) {
          const suffix = document.createElement("span");
          suffix.textContent = name.slice(firstSpace);
          el.appendChild(suffix);
        }
      } else {
        el.appendChild(document.createTextNode(config.brand.logoPrefix || ""));
        const suffix = document.createElement("span");
        suffix.textContent = config.brand.logoSuffix || "";
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

  hydratePage();
})();