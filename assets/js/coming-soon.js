(function () {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const semester = params.get("sem");

    const titleEl = document.getElementById("moduleTitle");
    const descEl = document.getElementById("moduleDesc");
    const tagEl = document.getElementById("moduleTag");

    if (semester && tagEl) {
        tagEl.textContent = `🚧 ${semester} • Under Construction`;
    }

    if (subject) {
        if (titleEl) titleEl.textContent = subject;
        if (descEl) {
            descEl.textContent = `We're currently preparing the interactive MCQ bank, practice quizzes, and mock exams for ${subject}. This module will be live soon!`;
        }
        document.title = `${subject} (Coming Soon) • CS MCQ Hub`;
    }
})();