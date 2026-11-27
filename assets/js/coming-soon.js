/* ==========================================================================
   ReviseLoop — Coming Soon & Legacy Link Resolver
   ========================================================================== */

(function () {
  const CFG = window.SITE_CONFIG || {};
  const brand = CFG.brand || {};
  const links = CFG.links || {};
  const catalog = Array.isArray(window.SUBJECTS_DATA) ? window.SUBJECTS_DATA : [];

  const params = new URLSearchParams(window.location.search);
  const rawId = (params.get("subject") || params.get("id") || params.get("exam") || "").trim();

  const iconEl = document.getElementById("cs-icon");
  const badgeEl = document.getElementById("cs-badge");
  const badgeTextEl = document.getElementById("cs-badge-text");
  const titleEl = document.getElementById("cs-title");
  const descEl = document.getElementById("cs-desc");
  const actionsEl = document.getElementById("cs-actions");
  const availableWrapEl = document.getElementById("cs-available-wrap");
  const availableChipsEl = document.getElementById("cs-available-chips");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderAvailableSubjects() {
    if (!availableWrapEl || !availableChipsEl) return;
    const readySubjects = catalog.filter((s) => s && s.ready).slice(0, 4);
    if (readySubjects.length === 0) return;

    availableWrapEl.hidden = false;
    availableChipsEl.innerHTML = readySubjects
      .map((sub) => {
        return `<a href="quiz.html?subject=${encodeURIComponent(sub.id)}" class="cs-subject-chip"><span aria-hidden="true">${escapeHtml(sub.icon || "📘")}</span><span>${escapeHtml(sub.title)}</span></a>`;
      })
      .join("");
  }

  const subject = rawId
    ? catalog.find((s) => s && String(s.id || "").toLowerCase() === rawId.toLowerCase())
    : null;

  if (!subject) {
    renderAvailableSubjects();
    return;
  }

  const trackLabel = subject.track || subject.semester || "Curriculum";
  document.title = `${subject.title} — ${brand.name || "ReviseLoop"}`;

  if (iconEl) iconEl.textContent = subject.icon || "📘";
  if (titleEl) titleEl.textContent = subject.title;

  if (subject.ready) {
    if (badgeEl) badgeEl.classList.add("is-ready");
    if (badgeTextEl) badgeTextEl.textContent = `${trackLabel} • Ready`;
    if (descEl) {
      descEl.textContent = `${subject.title} is now live and ready for practice! Jump straight into the question bank below.`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <a href="quiz.html?subject=${encodeURIComponent(subject.id)}" class="btn btn-primary">Start Practising →</a>
        <a href="index.html" class="btn btn-secondary">← All Subjects</a>
      `;
    }
    return;
  }

  if (badgeTextEl) {
    badgeTextEl.textContent = `${trackLabel} • ${subject.status || "Coming Soon"}`;
  }
  if (descEl) {
    const details = subject.description ? ` (${subject.description})` : "";
    descEl.textContent = `The MCQ bank for ${subject.title}${details} is currently in preparation. Check back soon or explore available subjects in the meantime.`;
  }
  if (actionsEl) {
    const contribBtn = links.issuesUrl
      ? `<a href="${escapeHtml(links.issuesUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Contribute MCQs ↗</a>`
      : "";
    actionsEl.innerHTML = `
      <a href="index.html" class="btn btn-primary">← Browse Available Subjects</a>
      ${contribBtn}
    `;
  }

  renderAvailableSubjects();
})();