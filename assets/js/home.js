/* ==========================================================================
   ReviseLoop — Home Catalog & Filtering Controller
   ========================================================================== */

(function () {
  const CFG = window.SITE_CONFIG || {};
  const catalogConfig = CFG.catalog || {};
  const storageConfig = CFG.storage || {};
  // Legacy prefix preserved intentionally so existing saved progress still loads.
  const storagePrefix = storageConfig.prefix || "reviseloop_";
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
  const searchClearBtn = document.getElementById("searchClearBtn");
  const searchKbd = document.getElementById("searchKbd");
  const filterTabs = document.getElementById("filterTabs");
  const searchScopeNote = document.getElementById("searchScopeNote");
  const activeTrackStat = document.getElementById("activeSemStat");
  const totalSubjectsStat = document.getElementById("totalSubjectsStat");
  const attemptedStat = document.getElementById("attemptedStat");
  const attemptedLabel = document.getElementById("attemptedLabel");
  const accuracyStat = document.getElementById("accuracyStat");
  const accuracyLabel = document.getElementById("accuracyLabel");
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

  function getSubjectTotalCount(sub, parsedStats) {
    if (parsedStats && typeof parsedStats.total === "number" && parsedStats.total > 0) {
      return parsedStats.total;
    }
    if (sub && typeof sub.questionCount === "number" && sub.questionCount > 0) {
      return sub.questionCount;
    }
    return null;
  }

  function readSubjectProgress(sub) {
    if (!sub || !sub.id) return null;
    try {
      const raw = localStorage.getItem(getSubjectStorageKey(sub.id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
      const stats = parsed.stats && typeof parsed.stats === "object" ? parsed.stats : null;
      const total = getSubjectTotalCount(sub, stats);
      const missedCount = Array.isArray(parsed.missed) ? parsed.missed.length : 0;
      const savedCount = Array.isArray(parsed.bookmarked) ? parsed.bookmarked.length : 0;

      if (stats && typeof stats.answered === "number") {
        const attempted = Math.max(0, stats.answered);
        const correct = typeof stats.correct === "number" ? Math.max(0, stats.correct) : 0;
        const wrong = typeof stats.wrong === "number" ? Math.max(0, stats.wrong) : 0;
        const accuracy = attempted > 0 && typeof stats.accuracy === "number" ? stats.accuracy : null;
        return { attempted, correct, wrong, missedCount, savedCount, total, accuracy, exact: true, updatedAt };
      }

      // Legacy fallback before subject is re-opened under updated quiz-engine.js
      const selected = parsed.selected && typeof parsed.selected === "object" ? parsed.selected : {};
      const attempted = Object.keys(selected).length;
      return { attempted, correct: 0, wrong: 0, missedCount, savedCount, total, accuracy: null, exact: false, updatedAt };
    } catch (err) {
      return null;
    }
  }

  function collectAllProgress() {
    let totalAttempted = 0;
    let totalExactAttempted = 0;
    let totalExactCorrect = 0;
    let latestSubject = null;
    let latestProgress = null;

    catalog.forEach((sub) => {
      if (!sub || !sub.ready) return;
      const progress = readSubjectProgress(sub);
      if (!progress) return;

      totalAttempted += progress.attempted;
      if (progress.exact && progress.attempted > 0) {
        totalExactAttempted += progress.attempted;
        totalExactCorrect += progress.correct;
      }

      const isComplete = progress.total != null && progress.attempted >= progress.total;
      const hasActivity = progress.updatedAt > 0 || progress.attempted > 0;
      if (hasActivity && !isComplete) {
        if (!latestProgress || progress.updatedAt > latestProgress.updatedAt) {
          latestSubject = sub;
          latestProgress = progress;
        }
      }
    });

    const overallAccuracy = totalExactAttempted > 0
      ? Math.round((totalExactCorrect / totalExactAttempted) * 100)
      : null;

    return { totalAttempted, overallAccuracy, latestSubject, latestProgress };
  }

  function updateHeroStats(summary) {
    const activeReadyCount = catalog.filter((s) => s.ready && normalizeTrack(s) === activeTrack).length;
    const totalQuestions = catalog.reduce((acc, s) => {
      return acc + (s && s.ready && typeof s.questionCount === "number" ? s.questionCount : 0);
    }, 0);

    if (activeTrackStat) {
      activeTrackStat.textContent = `${activeReadyCount} Subject${activeReadyCount === 1 ? "" : "s"}`;
    }
    if (totalSubjectsStat) {
      totalSubjectsStat.textContent = String(catalog.length);
    }

    if (summary.totalAttempted === 0) {
      if (attemptedStat) {
        attemptedStat.textContent = totalQuestions > 0 ? `${totalQuestions}+` : "Offline";
      }
      if (attemptedLabel) {
        attemptedLabel.textContent = totalQuestions > 0 ? "Questions" : "Workspace";
      }
      if (accuracyStat) {
        accuracyStat.textContent = "Local";
      }
      if (accuracyLabel) {
        accuracyLabel.textContent = "Auto-Saved";
      }
    } else {
      if (attemptedStat) {
        attemptedStat.textContent = String(summary.totalAttempted);
      }
      if (attemptedLabel) {
        attemptedLabel.textContent = "Attempted";
      }
      if (accuracyStat) {
        accuracyStat.textContent = summary.overallAccuracy == null ? "—" : `${summary.overallAccuracy}%`;
      }
      if (accuracyLabel) {
        accuracyLabel.textContent = "Accuracy";
      }
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

    let subline = "";
    if (latestProgress.attempted > 0) {
      const countPart = latestProgress.total != null
        ? `${latestProgress.attempted} of ${latestProgress.total} answered`
        : `${latestProgress.attempted} answered`;
      const accPart = latestProgress.accuracy != null
        ? ` • ${latestProgress.correct} correct (${latestProgress.accuracy}%)`
        : "";
      const missedPart = latestProgress.missedCount > 0
        ? ` • ${latestProgress.missedCount} to retry`
        : "";
      subline = countPart + accPart + missedPart;
    } else if (latestProgress.total != null) {
      subline = `Last opened • ${latestProgress.total} questions available`;
    } else {
      subline = "Last opened • Ready to practise";
    }

    continueSection.hidden = false;
    continueSection.innerHTML = `
      <div class="continue-card">
        <div class="continue-meta">
          <span class="continue-icon" aria-hidden="true">${escapeHtml(latestSubject.icon || "📘")}</span>
          <div>
            <div class="continue-eyebrow">Continue where you left off</div>
            <div class="continue-title">${escapeHtml(latestSubject.title)}</div>
            <div class="continue-sub">${escapeHtml(subline)}</div>
          </div>
        </div>
        <a href="quiz.html?subject=${encodeURIComponent(latestSubject.id)}" class="btn btn-primary">
          Resume Practice →
        </a>
      </div>
    `;
  }

  function formatCardBadge(sub, track, progress) {
    if (!sub.ready) {
      return escapeHtml(track);
    }

    const total = progress ? progress.total : getSubjectTotalCount(sub, null);
    if (progress && progress.attempted > 0) {
      if (total != null) {
        return escapeHtml(`${progress.attempted} / ${total} Qs`);
      }
      return escapeHtml(`${progress.attempted} Practised`);
    }

    if (total != null) {
      return escapeHtml(`${total} Qs`);
    }

    return escapeHtml(sub.status || readyStatus);
  }

  function renderCardReviewPills(progress) {
    if (!progress) return "";
    const chips = [];
    if (progress.missedCount > 0) {
      chips.push(`<span class="review-chip is-missed">${progress.missedCount} to retry</span>`);
    }
    if (progress.savedCount > 0) {
      chips.push(`<span class="review-chip is-saved">${progress.savedCount} saved</span>`);
    }
    return chips.length > 0 ? `<div class="card-review-pills">${chips.join("")}</div>` : "";
  }

  function renderCardProgress(progress) {
    if (!progress || progress.attempted <= 0) return "";

    if (progress.total != null && progress.total > 0) {
      const pct = Math.min(100, Math.round((progress.attempted / progress.total) * 100));
      const accText = progress.accuracy != null ? `${progress.accuracy}% accuracy` : `${pct}% complete`;
      return `
        <div class="card-progress">
          <div class="card-progress-meta">
            <span>${pct}% complete</span>
            <span>${escapeHtml(accText)}</span>
          </div>
          <div class="card-progress-track" aria-hidden="true">
            <div class="card-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="card-progress">
        <div class="card-progress-meta">
          <span>${progress.attempted} answered</span>
          <span>${progress.accuracy != null ? `${progress.accuracy}% accuracy` : "In progress"}</span>
        </div>
      </div>
    `;
  }

  function syncSearchControls() {
    const hasText = searchTerm.length > 0;
    if (searchClearBtn) searchClearBtn.hidden = !hasText;
    if (searchKbd) searchKbd.hidden = hasText;
  }

  function renderSubjects() {
    if (!gridEl) return;

    syncSearchControls();
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
          <p>Try searching another keyword or reset your filters to view all subjects.</p>
          <button type="button" class="btn btn-secondary" id="resetCatalogFiltersBtn">Reset Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById("resetCatalogFiltersBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          searchTerm = "";
          if (searchInput) searchInput.value = "";
          activeFilter = "All";
          if (filterTabs) {
            filterTabs.querySelectorAll(".filter-btn").forEach((b) => {
              const isAll = b.dataset.filter === "All";
              b.classList.toggle("active", isAll);
              b.setAttribute("aria-pressed", String(isAll));
            });
          }
          renderSubjects();
        });
      }
      return;
    }

    gridEl.innerHTML = filtered.map((sub) => {
      const track = normalizeTrack(sub);
      const progress = sub.ready ? readSubjectProgress(sub) : null;
      const badgeText = formatCardBadge(sub, track, progress);
      const codePill = sub.courseCode
        ? `<span class="course-code-pill">${escapeHtml(sub.courseCode)}</span>`
        : "";

      if (!sub.ready) {
        return `
          <article class="subject-card is-upcoming" aria-disabled="true">
            <div class="card-top">
              <span class="subject-icon" aria-hidden="true">${escapeHtml(sub.icon || "📘")}</span>
              <div class="card-badges">
                ${codePill}
                <span class="subject-badge is-upcoming">${badgeText}</span>
              </div>
            </div>
            <h3>${escapeHtml(sub.title)}</h3>
            <p>${escapeHtml(sub.description || "")}</p>
            <span class="card-btn disabled" aria-disabled="true">${escapeHtml(sub.status || upcomingStatus)}</span>
          </article>
        `;
      }

      const targetUrl = `quiz.html?subject=${encodeURIComponent(sub.id)}`;
      const ctaLabel = progress && progress.attempted > 0 ? "Continue Practising →" : "Start Practising →";
      return `
        <article class="subject-card">
          <div class="card-top">
            <span class="subject-icon" aria-hidden="true">${escapeHtml(sub.icon || "📘")}</span>
            <div class="card-badges">
              ${codePill}
              <span class="subject-badge">${badgeText}</span>
            </div>
          </div>
          <h3>${escapeHtml(sub.title)}</h3>
          <p>${escapeHtml(sub.description || "")}</p>
          ${renderCardReviewPills(progress)}
          ${renderCardProgress(progress)}
          <a href="${targetUrl}" class="card-btn">${ctaLabel}</a>
        </article>
      `;
    }).join("");
  }

  function refreshCatalogView() {
    const progressSummary = collectAllProgress();
    updateHeroStats(progressSummary);
    renderContinueBanner(progressSummary);
    renderSubjects();
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

  if (searchClearBtn && searchInput) {
    searchClearBtn.addEventListener("click", () => {
      searchTerm = "";
      searchInput.value = "";
      renderSubjects();
      searchInput.focus();
    });
  }

  window.addEventListener("pageshow", refreshCatalogView);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshCatalogView();
    }
  });

  refreshCatalogView();
})();