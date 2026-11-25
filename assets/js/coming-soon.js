(function () {
    const CFG = window.SITE_CONFIG || {};
    const brand = CFG.brand || {};
    const links = CFG.links || {};
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const semester = params.get("sem");

    const titleEl = document.getElementById("moduleTitle");
    const descEl = document.getElementById("moduleDesc");
    const tagEl = document.getElementById("moduleTag");
    const isLocal = window.location.protocol === "file:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
    const homeUrl = isLocal ? "index.html" : (links.liveUrl || "index.html");

    document.querySelectorAll("[data-config-href='links.repoUrl']").forEach((el) => {
        if (links.repoUrl) el.href = links.repoUrl;
    });
    document.querySelectorAll("[data-config-home-link]").forEach((el) => {
        el.href = homeUrl;
    });

    if (semester && tagEl) {
        tagEl.textContent = `🚧 ${semester} • Under Construction`;
    }

    if (subject) {
        if (titleEl) titleEl.textContent = subject;
        if (descEl) {
            descEl.textContent = `We're currently preparing the interactive MCQ bank, practice quizzes, and mock exams for ${subject}. This module will be live soon!`;
        }
        document.title = `${subject} (Coming Soon) • ${brand.name || "CS MCQ Hub"}`;
    }
})();