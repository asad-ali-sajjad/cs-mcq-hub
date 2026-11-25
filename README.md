<div align="center">

# 🚀 CS-MCQ-HUB

**Study Smarter. Revise Faster.**  
*An interactive, offline-friendly MCQ workspace for Computer Science exam preparation.*

A fast, zero-backend interactive MCQ practice, mock exam, and mistake-review platform built with vanilla HTML, CSS, and JavaScript. Designed to run seamlessly both locally (`file://`) and on static hosts like GitHub Pages.

[![Live Demo](https://img.shields.io/badge/Live_Site-GitHub_Pages-5b7cff?style=for-the-badge&logo=github)](https://asad-ali-sajjad.github.io/cs-mcq-hub/)
[![Repo Size](https://img.shields.io/github/repo-size/asad-ali-sajjad/cs-mcq-hub?style=for-the-badge&color=0f172a)](https://github.com/asad-ali-sajjad/cs-mcq-hub)
[![Last Commit](https://img.shields.io/github/last-commit/asad-ali-sajjad/cs-mcq-hub?style=for-the-badge&color=10b981)](https://github.com/asad-ali-sajjad/cs-mcq-hub/commits/main)

[🌐 Launch Live Workspace](https://asad-ali-sajjad.github.io/cs-mcq-hub/) • [📁 Project Structure](#-project-structure) • [🐛 Report an Issue](https://github.com/asad-ali-sajjad/cs-mcq-hub/issues)

</div>

---

## 📁 Project Structure

```text
cs-mcq-hub/
├── index.html                  # Subject catalog & semester filter hub
├── quiz.html                   # Universal interactive quiz, mock exam & review workspace
├── coming-soon.html            # Placeholder view for upcoming subjects
├── README.md                   # Project documentation
├── assets/
│   ├── css/
│   │   ├── global.css          # Shared design tokens, typography, themes & ambient background
│   │   ├── home.css            # Subject catalog grid & card styles
│   │   ├── quiz.css            # Sidebar, MCQ cards, modals & floating dock styles
│   │   └── coming-soon.css     # Coming-soon page styles
│   └── js/
│       ├── config.js           # Central site branding, links, catalog & quiz settings
│       ├── subjects-data.js    # Central subject registry (IDs, metadata, readiness & file paths)
│       ├── home.js             # Catalog rendering, search & semester filtering
│       ├── quiz-engine.js      # Universal quiz engine, mock generator, upload validator & shortcuts
│       ├── coming-soon.js      # Dynamic metadata loader for unreleased subjects
│       └── theme.js            # Persistent Light / Dark theme switcher
└── data/
    ├── core-cs/                # Core Computer Science subject banks
    ├── sem-7/                  # 7th Semester subject banks
    │   ├── automata.js
    │   ├── cloud-computing.js
    │   ├── deep-learning.js    # 200 MCQs (Weeks 1–8)
    │   └── pdc.js              # Parallel & Distributed Computing MCQs
    └── sem-8/                  # 8th Semester subject banks
```

`config.js` is loaded before the other scripts on each page and exposes its settings through `window.SITE_CONFIG`. It uses classic scripts (no ES modules) so the workspace remains usable from both `file://` and GitHub Pages.

---

## ✨ Features Built

### 1. Dynamic Multi-Subject Architecture
- **URL-Driven Subject Loading:** Opening `quiz.html?subject=<id>` automatically resolves the subject from `subjects-data.js` (or standard `data/` folders) and injects its `.js` question bank without CORS issues.
- **Isolated Per-Subject Storage:** Progress, missed answers, and bookmarks use a per-subject `localStorage` key built from the configured storage prefix and version, preventing cross-course collisions.
- **Local File Upload & Validator:** Upload custom `.json` or `.js` question banks directly in the browser with schema validation, syntax checking, and downloadable starter templates.

### 2. Five Study & Exam Modes
- **📖 Study Bank:** Browse all questions with answers and detailed explanations (`exp` / `explanation`) unlocked.
- **✍️ Sequential Quiz:** Practice question-by-question with instant grading, individual Show Answer reveals, option shuffling (`🔀 Shuffle`), and an inline `↺ Reset Quiz` button with configurable `↺ Undo` recovery.
- **🎲 Mock Exam:** Generate randomized exams (10, 25, 50, or 100 questions) filtered by difficulty, supporting both Instant Feedback and Exam Mode (graded upon submission).
- **❌ Missed / Wrong Review:** Automatically collects incorrect answers from Sequential Quiz and Mock Exams; includes `🔄 Retry Missed` (auto-removes questions once answered correctly) and batch clear with Undo.
- **⭐ Saved Review:** Bookmark tricky questions (`☆ Save`) for targeted revision or self-quizzing.

### 3. Smart Difficulty & Rich Explanations
- **Automatic Difficulty Classification:** Respects explicit `"difficulty"` tags when provided and automatically classifies untagged banks into Easy, Medium, and Hard tiers based on computational/structural complexity.
- **Structured Explanations:** Normalizes `exp`, `explanation`, and `feedback` fields into clean, readable explanation callouts beneath every answer banner.

### 4. Mobile-Friendly Navigation & Keyboard Shortcuts
- **Floating Quick-Nav Dock:** Thumb-accessible `Next ↓` and `↑ Top` pill buttons anchored in the bottom-right corner; automatically advances across paginated batches.
- **Responsive Collapsible Sidebar:** Slide-over drawer on mobile and collapsible rail on desktop with live completion telemetry and accuracy tracking.
- **Light / Dark Theme:** Persistent theme toggle across all pages (`theme.js`).

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `N` / `J` / `↓` | Advance & scroll to the next question |
| `K` / `↑` | Move focus up to the previous question |
| `A` – `D` or `1` – `4` | Select Option A, B, C, or D on the focused card |
| `T` | Scroll back to the top & focus the first question |
| `S` | Bookmark / unsave the focused question |
| `E` | Reveal the answer in Sequential Quiz mode |
| `/` | Open sidebar and focus the keyword search input |
| `[` | Collapse or expand the navigation sidebar |
| `?` / `Esc` | Open interactive shortcuts modal / close active modal |

---

## ➕ Adding a New Subject Bank

1. Create the data file inside `data/sem-7/`, `data/sem-8/`, or `data/core-cs/` (e.g., `data/sem-7/automata.js`):

```javascript
const MCQS = [
  {
    num: 1,
    q: "Which automaton model recognizes regular languages?",
    A: "Pushdown Automaton",
    B: "Deterministic Finite Automaton (DFA)",
    C: "Linear Bounded Automaton",
    D: "Turing Machine",
    ans: "B",
    exp: "DFAs and NFAs have finite memory and recognize the exact class of regular languages."
  }
];
```

*(Optional fields per item: `difficulty: "easy" | "medium" | "hard"`, `topic: "<topic-id>"`, `week: 1`.)*

2. Enable the subject in `assets/js/subjects-data.js`:

```javascript
{
  id: "automata",
  title: "Theory of Automata",
  semester: "7th Sem",
  status: "Finals Prep",
  icon: "⚙️",
  description: "DFAs, NFAs, Regular Expressions, CFGs & Turing Machines",
  ready: true,
  dataFile: "data/sem-7/automata.js"
}
```