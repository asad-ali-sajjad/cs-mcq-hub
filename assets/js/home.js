(function () {
    const subjectGrid = document.getElementById("subjectGrid");
    const searchInput = document.getElementById("searchInput");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const totalSubjectsStat = document.getElementById("totalSubjectsStat");
    const activeSemStat = document.getElementById("activeSemStat");

    let currentFilter = "7th Sem"; // Focus on 7th Sem finals by default
    let searchQuery = "";

    // Update dynamic stats
    if (totalSubjectsStat) {
        const realSubjects = SUBJECTS_DATA.filter((s) => s.id !== "sem-8-placeholder");
        totalSubjectsStat.textContent = `${realSubjects.length}`;
    }

    if (activeSemStat) {
        const sem7Count = SUBJECTS_DATA.filter((s) => s.semester === "7th Sem").length;
        activeSemStat.textContent = `${sem7Count} Subjects`;
    }

    function getSubjectLink(subject) {
        if (subject.ready) {
            return `quiz.html?subject=${encodeURIComponent(subject.id)}`;
        }
        return `coming-soon.html?subject=${encodeURIComponent(subject.title)}&sem=${encodeURIComponent(subject.semester)}`;
    }

    function renderSubjects() {
        const filtered = SUBJECTS_DATA.filter((subject) => {
            const matchesFilter =
                currentFilter === "All" || subject.semester === currentFilter;

            const searchableText = `${subject.title} ${subject.description} ${subject.semester}`.toLowerCase();
            const matchesSearch = searchableText.includes(searchQuery);

            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            subjectGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No matching subjects found</h3>
                    <p>Try clearing your search term or switching semester tabs above.</p>
                </div>
            `;
            return;
        }

        subjectGrid.innerHTML = filtered
            .map((subject) => {
                const isCurrentSem = subject.semester === "7th Sem";
                const badgeClass = isCurrentSem ? "sem-badge active-sem" : "sem-badge";
                const buttonLabel = subject.ready ? "Start Practice →" : "Launch Subject";

                return `
                    <div class="subject-card">
                        <div>
                            <div class="card-top">
                                <span class="subject-icon">${subject.icon}</span>
                                <span class="${badgeClass}">${subject.semester} • ${subject.status}</span>
                            </div>
                            <h3>${subject.title}</h3>
                            <p>${subject.description}</p>
                        </div>
                        <a class="subject-link" href="${getSubjectLink(subject)}">
                            ${buttonLabel}
                        </a>
                    </div>
                `;
            })
            .join("");
    }

    // Filter tab click handlers
    filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderSubjects();
        });
    });

    // Live search handler
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderSubjects();
        });
    }

    // Initial render
    renderSubjects();
})();