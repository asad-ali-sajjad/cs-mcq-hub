/* ==========================================================================
   CS MCQ Hub — Home Catalog & Filtering Controller
   ========================================================================== */

(function () {
  const CFG = window.SITE_CONFIG || {};
  const catalogConfig = CFG.catalog || {};
  const tracks = Array.isArray(catalogConfig.tracks) ? catalogConfig.tracks : [
    { id: 'Active Track', label: '⚡ Active Track' },
    { id: 'Electives', label: '🚀 Electives' },
    { id: 'Core CS', label: '📚 Core CS' },
    { id: 'All', label: 'All Subjects' }
  ];
  const defaultTrack = catalogConfig.defaultTrack || 'Active Track';
  const activeTrack = (tracks[0] && tracks[0].id) || defaultTrack;
  const coreTrack = (tracks[2] && tracks[2].id) || 'Core CS';
  const electivesTrack = (tracks[1] && tracks[1].id) || 'Electives';
  const readyStatus = catalogConfig.defaultStatusReady || 'Exam Prep';
  const upcomingStatus = catalogConfig.defaultStatusUpcoming || 'Coming Soon';
  const catalog = Array.isArray(window.SUBJECTS_DATA) ? window.SUBJECTS_DATA : [];
  const gridEl = document.getElementById('subjectGrid');
  const searchInput = document.getElementById('searchInput');
  const filterTabs = document.getElementById('filterTabs');
  const activeTrackStat = document.getElementById('activeSemStat');
  const totalSubjectsStat = document.getElementById('totalSubjectsStat');

  let activeFilter = defaultTrack;
  let searchTerm = '';

  function normalizeTrack(sub) {
    const raw = (sub.track || sub.semester || coreTrack).trim();
    if (raw === '7th Sem') return activeTrack;
    if (raw === '8th Sem') return electivesTrack;
    return raw;
  }

  function updateHeroStats() {
    const activeCount = catalog.filter(s => normalizeTrack(s) === activeTrack).length;
    if (activeTrackStat) {
      activeTrackStat.textContent = `${activeCount} Subject${activeCount === 1 ? '' : 's'}`;
    }
    if (totalSubjectsStat) {
      totalSubjectsStat.textContent = String(catalog.length);
    }
  }

  function renderSubjects() {
    if (!gridEl) return;

    const query = searchTerm.trim().toLowerCase();
    const filtered = catalog.filter(sub => {
      const track = normalizeTrack(sub);
      const matchesFilter = activeFilter === 'All' || track === activeFilter;
      if (!matchesFilter) return false;

      if (!query) return true;
      const haystack = `${sub.title} ${sub.description || ''} ${track} ${sub.status || ''} ${sub.courseCode || ''}`.toLowerCase();
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="empty-catalog" style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--card); border: 1px solid var(--border); border-radius: 22px; color: var(--muted);">
          <h3 style="color: var(--text); margin-bottom: 6px;">No matching subjects found</h3>
          <p>Try searching another keyword or switch to <strong>All Subjects</strong>.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map(sub => {
      const track = normalizeTrack(sub);
      const status = sub.status || (sub.ready ? readyStatus : upcomingStatus);
      const targetUrl = sub.ready
        ? `quiz.html?subject=${encodeURIComponent(sub.id)}`
        : `coming-soon.html?subject=${encodeURIComponent(sub.id)}`;
      const ctaLabel = sub.ready ? 'Start Practice →' : upcomingStatus;
      const btnClass = sub.ready ? 'card-btn' : 'card-btn disabled';

      return `
        <article class="subject-card">
          <div class="card-top">
            <span class="subject-icon">${sub.icon || '📘'}</span>
            <span class="subject-badge">${track} • ${status}</span>
          </div>
          <h3>${sub.title}</h3>
          <p>${sub.description || ''}</p>
          <a href="${targetUrl}" class="${btnClass}">${ctaLabel}</a>
        </article>
      `;
    }).join('');
  }

  if (filterTabs) {
    filterTabs.replaceChildren();
    tracks.forEach((track) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `filter-btn${track.id === defaultTrack ? ' active' : ''}`;
      button.dataset.filter = track.id;
      button.textContent = track.label;
      filterTabs.appendChild(button);
    });
    filterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      activeFilter = btn.dataset.filter || 'All';
      filterTabs.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderSubjects();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderSubjects();
    });
  }

  updateHeroStats();
  renderSubjects();
})();