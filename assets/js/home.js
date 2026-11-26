/* ==========================================================================
   CS MCQ Hub — Home Catalog & Filtering Controller
   ========================================================================== */

(function () {
  const CFG = window.SITE_CONFIG || {};
  const catalogConfig = CFG.catalog || {};
  const storageConfig = CFG.storage || {};
  const storagePrefix = storageConfig.prefix || "cs_mcq_hub_";
  const storageVersion = storageConfig.version || "v1";

  const tracks = Array.isArray(catalogConfig.tracks) && catalogConfig.tracks.length > 0
    ? catalogConfig.tracks
    : [
        { id: "Active Track", role: "active", label: "⚡ Active Track" },
        { id: "Electives", role: "electives", label: "🚀 Electives" },
        { id: "Core CS", role: "core", label: "📚 Core CS" },
        { id: "All", role: "all", label: "All Subjects" }
      ];

  function findTrackIdByRole(role, fallback) {
    const found = tracks.find((t) => t && t.role === role);
    return (found && found.id) || fallback;
  }

  const defaultTrack = catalogConfig.defaultTrack || findTrackIdByRole("active", "Active Track");
  const activeTrack = findTrackIdByRole("active", defaultTrack);
  const coreTrack = findTrackIdByRole("core", "Core CS");
  const readyStatus = catalogConfig.defaultStatusReady || "Exam Prep";
  const upcomingStatus = catalogConfig.defaultStatusUpcoming || "Coming Soon";
  const catalog = Array.isArray(window.SUBJECTS_DATA) ? window.SUBJECTS_DATA : [];

  const gridEl = document.getElementById("subjectGrid");
  const searchInput = document.getElementById("searchInput");
  const filterTabs = document.getElementById("filterTabs");
  const searchScopeNote = document.getElementById("searchScopeNote");
  const activeTrackStat = document.getElementById("activeSemStat");
  const totalSubjectsStat = document.getElementById("totalSubjectsStat");
  const attemptedStat = document.getElementById("attemptedStat");
  const accuracyStat = document.getElementById("accuracyStat");
  const continueSection = document.getElementById("continueSection");

  let activeFilter = defaultTrack;
  let searchTerm = "";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeTrack(sub) {
    return (sub.track || sub.semester || coreTrack).trim();
  }

  function getSubjectStorageKey(subjectId) {
    return `${storagePrefix}${subjectId}_${storageVersion}`;
  }

  function readSubjectProgress(subjectId) {
    try {
      const raw = localStorage.getItem(getSubjectStorageKey(subjectId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      const selected = parsed.selected && typeof parsed.selected === "object" ? parsed.selected : {};
      const missed = parsed.missed && typeof parsed.missed === "object" ? parsed.missed : {};
      const selectedKeys = Object.keys(selected);
      const attempted = selectedKeys.length;
      let wrongCount = 0;

      selectedKeys.forEach((num) => {
        if (Object.prototype.hasOwnProperty.call(missed, num)) {
          wrongCount += 1;
        }
      });

      const correct = Math.max(0, attempted - wrongCount);
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
      const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;

      return { attempted, correct, wrongCount, accuracy, updatedAt };
    } catch (err) {
      return null;
    }
  }

  function collectAllProgress() {
    let totalAttempted = 0;
    let totalCorrect = 0;
    let latestSubject = null;
    let latestProgress = null;

    catalog.forEach((sub) => {
      if (!sub || !sub.ready) return;
      const progress = readSubjectProgress(sub.id);
      if (!progress || progress.attempted === 0) return;

      totalAttempted += progress.attempted;
      totalCorrect += progress.correct;

      const isComplete = typeof sub.questionCount === "number" && sub.questionCount > 0 && progress.attempted >= sub.questionCount;
      if (!isComplete) {
        if (!latestProgress || progress.updatedAt > latestProgress.updatedAt) {
          latestSubject = sub;
          latestProgress = progress;
        }
      }
    });

    const overallAccuracy = totalAttempted > 0
      ? Math.round((totalCorrect / totalAttempted) * 100)
      : null;

    return { totalAttempted, totalCorrect, overallAccuracy, latestSubject, latestProgress };
  }

  function updateHeroStats(summary) {
    const activeReadyCount = catalog.filter((s) => s.ready && normalizeTrack(s) === activeTrack).length;
    if (activeTrackStat) {
      activeTrackStat.textContent = `${activeReadyCount} Subject${activeReadyCount === 1 ? "" : "s"}`;
    }
    if (totalSubjectsStat) {
      totalSubjectsStat.textContent = String(catalog.length);
    }
    if (attemptedStat) {
      attemptedStat.textContent = String(summary.totalAttempted);
    }
    if (accuracyStat) {
      accuracyStat.textContent = summary.overallAccuracy == null ? "—" : `${summary.overallAccuracy}%`;
    }
  }

  function renderContinueBanner(summary) {
    if (!continueSection) return;
    const { latestSubject, latestProgress } = summary;

    if (!latestSubject || !latestProgress) {
      continueSection.hidden = true;
      continueSection.innerHTML = "";
      return;
    }

    const countText = typeof latestSubject.questionCount === "number" && latestSubject.questionCount > 0
      ? `${latestProgress.attempted} of ${latestSubject.questionCount} answered`
      : `${latestProgress.attempted} answered`;
    const accText = latestProgress.accuracy != null ? ` • ${latestProgress.accuracy}% accuracy` : "";

    continueSection.hidden = false;
    continueSection.innerHTML = `
      <div class="continue-card">
        <div class="continue-meta">
          <span class="continue-icon" aria-hidden="true">${escapeHtml(latestSubject.icon || "📘")}</span>
          <div>
            <div class="continue-eyebrow">Continue where you left off</div>
            <div class="continue-title">${escapeHtml(latestSubject.title)}</div>
            <div class="continue-sub">${escapeHtml(countText + accText)}</div>
          </div>
        </div>
        <a href="quiz.html?subject=${encodeURIComponent(latestSubject.id)}" class="btn btn-primary">
          Resume Practice →
        </a>
      </div>
    `;
  }

  function formatCardBadge(sub, track) {
    if (!sub.ready) {
      return escapeHtml(track);
    }

    const progress = readSubjectProgress(sub.id);
    const hasCount = typeof sub.questionCount === "number" && sub.questionCount > 0;

    if (progress && progress.attempted > 0) {
      const progressPart = hasCount ? `${progress.attempted}/${sub.questionCount}` : `${progress.attempted} done`;
      const accPart = progress.accuracy != null ? ` • ${progress.accuracy}%` : "";
      return escapeHtml(`${progressPart}${accPart}`);
    }

    if (hasCount) {
      return escapeHtml(`${sub.questionCount} Qs • ${sub.status || readyStatus}`);
    }

    return escapeHtml(sub.status || readyStatus);
  }

  function renderSubjects() {
    if (!gridEl) return;

    const query = searchTerm.trim().toLowerCase();
    const isSearchingAll = query.length > 0;

    if (searchScopeNote) {
      searchScopeNote.textContent = isSearchingAll
        ? "Searching across all tracks"
        : "";
    }

    const filtered = catalog.filter((sub) => {
      const track = normalizeTrack(sub);
      if (!isSearchingAll && activeFilter !== "All" && track !== activeFilter) {
        return false;
      }

      if (!query) return true;
      const haystack = `${sub.title} ${sub.description || ""} ${track} ${sub.status || ""} ${sub.courseCode || ""}`.toLowerCase();
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="empty-state">
          <h3>No matching subjects found</h3>
          <p>Try searching another keyword or switch to <strong>All Subjects</strong>.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map((sub) => {
      const track = normalizeTrack(sub);
      const badgeText = formatCardBadge(sub, track);

      if (!sub.ready) {
        return `
          <article class="subject-card is-upcoming" aria-disabled="true">
            <div class="card-top">
              <span class="subject-icon" aria-hidden="true">${escapeHtml(sub.icon || "📘")}</span>
              <span class="subject-badge is-upcoming">${badgeText}</span>
            </div>
            <h3>${escapeHtml(sub.title)}</h3>
            <p>${escapeHtml(sub.description || "")}</p>
            <span class="card-btn disabled" aria-disabled="true">${escapeHtml(sub.status || upcomingStatus)}</span>
          </article>
        `;
      }

      const targetUrl = `quiz.html?subject=${encodeURIComponent(sub.id)}`;
      return `
        <article class="subject-card">
          <div class="card-top">
            <span class="subject-icon" aria-hidden="true">${escapeHtml(sub.icon || "📘")}</span>
            <span class="subject-badge">${badgeText}</span>
          </div>
          <h3>${escapeHtml(sub.title)}</h3>
          <p>${escapeHtml(sub.description || "")}</p>
          <a href="${targetUrl}" class="card-btn">Start Practice →</a>
        </article>
      `;
    }).join("");
  }

  if (filterTabs) {
    filterTabs.replaceChildren();
    tracks.forEach((track) => {
      const isSelected = track.id === activeFilter;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-btn${isSelected ? " active" : ""}`;
      button.dataset.filter = track.id;
      button.setAttribute("aria-pressed", String(isSelected));
      button.textContent = track.label;
      filterTabs.appendChild(button);
    });

    filterTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      activeFilter = btn.dataset.filter || "All";
      filterTabs.querySelectorAll(".filter-btn").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      renderSubjects();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value;
      renderSubjects();
    });
  }

  const progressSummary = collectAllProgress();
  updateHeroStats(progressSummary);
  renderContinueBanner(progressSummary);
  renderSubjects();
})();