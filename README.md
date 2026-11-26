<div align="center">

# 🚀 CS-MCQ-HUB

**Study Smarter. Revise Faster.**  
*An interactive, offline-capable MCQ workspace for Computer Science exam preparation.*

A fast, zero-backend interactive MCQ practice, mock exam, and mistake-review platform built with vanilla HTML, CSS, and JavaScript. Designed to run seamlessly both locally (`file://`) and on static hosts like GitHub Pages with full offline PWA support.

[![Live Demo](https://img.shields.io/badge/Live_Site-GitHub_Pages-3b5bdb?style=for-the-badge&logo=github)](https://asad-ali-sajjad.github.io/cs-mcq-hub/)
[![Validate Banks](https://img.shields.io/github/actions/workflow/status/asad-ali-sajjad/cs-mcq-hub/validate-banks.yml?style=for-the-badge&label=Bank_Validation)](https://github.com/asad-ali-sajjad/cs-mcq-hub/actions/workflows/validate-banks.yml)
[![Repo Size](https://img.shields.io/github/repo-size/asad-ali-sajjad/cs-mcq-hub?style=for-the-badge&color=0f172a)](https://github.com/asad-ali-sajjad/cs-mcq-hub)
[![Last Commit](https://img.shields.io/github/last-commit/asad-ali-sajjad/cs-mcq-hub?style=for-the-badge&color=10b981)](https://github.com/asad-ali-sajjad/cs-mcq-hub/commits/main)

[🌐 Launch Live Workspace](https://asad-ali-sajjad.github.io/cs-mcq-hub/) • [📁 Project Structure](#-project-structure) • [✨ Features](#-features-built) • [⌨️ Shortcuts](#️-keyboard-shortcuts) • [🐛 Report an Issue](https://github.com/asad-ali-sajjad/cs-mcq-hub/issues)

</div>

---

## 📁 Project Structure

```text
cs-mcq-hub/
├── index.html                      # Subject catalog, live resume banner & track filter hub
├── quiz.html                       # Universal interactive quiz, mock exam & review workspace
├── coming-soon.html                # Dynamic status resolver for upcoming or legacy subject links
├── manifest.webmanifest            # PWA Web App Manifest (standalone mode & inline SVG icons)
├── sw.js                           # Service Worker (offline navigation & Stale-While-Revalidate cache)
├── project-context.json            # Versioned architectural & schema documentation for AI tooling
├── README.md                       # Repository documentation
├── .github/
│   └── workflows/
│       └── validate-banks.yml      # GitHub Actions CI workflow for automated MCQ bank validation
├── scripts/
│   └── validate-banks.js           # Zero-dependency Node.js schema & catalog validator
├── assets/
│   ├── css/
│   │   ├── global.css              # Design tokens, typography, Light/Dark themes & ambient blobs
│   │   ├── home.css                # Catalog grid, Continue banner, progress bars & filter tabs
│   │   ├── quiz.css                # Sidebar, MCQ cards/buttons, modals, telemetry & floating dock
│   │   └── coming-soon.css         # Status card styles for upcoming subjects
│   └── js/
│       ├── config.js               # Central site branding, links, catalog tracks & quiz defaults
│       ├── subjects-data.js        # Central subject registry (IDs, metadata, counts, readiness & paths)
│       ├── home.js                 # Catalog rendering, live resume tracking, search & track filters
│       ├── quiz-engine.js          # Universal quiz engine, mock generator, upload & export/import
│       ├── coming-soon.js          # Subject status & readiness resolver for coming-soon.html
│       ├── theme.js                # Persistent Light / Dark theme switcher
│       └── pwa.js                  # file://-safe PWA manifest & Service Worker bootstrap
└── data/
    ├── core-cs/                    # Core Computer Science subject banks
    ├── sem-7/                      # 7th Semester subject banks
    │   ├── deep-learning.js        # Deep Learning (200 MCQs across Weeks 1–8 with explanations)
    │   ├── pdc.js                  # Parallel & Distributed Computing (526 MCQs)
    │   ├── automata.js             # Theory of Automata (upcoming placeholder)
    │   └── cloud-computing.js      # Cloud Computing (upcoming placeholder)
    └── sem-8/                      # 8th Semester subject banks
```

`config.js` loads before page scripts and exposes settings via `window.SITE_CONFIG`. All scripts are classic non-module scripts so the entire hub runs cleanly both by double-clicking `index.html` (`file://`) and on GitHub Pages (`https://`).

---

## ✨ Features Built

### 1. Dynamic Multi-Subject Architecture & Live Resume Tracking
- **URL-Driven Subject Loading:** Opening `quiz.html?subject=<id>` resolves the subject from `subjects-data.js` (or standard `data/` folders) and dynamically injects its `.js` bank via `<script>` tags—avoiding `file://` CORS restrictions.
- **Continue Where You Left Off & Live Telemetry:** The home hub (`index.html`) tracks your last opened or practiced subject, displays a **Continue where you left off** resume banner, aggregates total attempted questions and exact accuracy, and renders per-card progress bars (staying synced across browser Back-button navigation via `pageshow`).
- **Isolated Per-Subject Storage:** Progress, missed answers, bookmarks, and exact stats snapshots are scoped per subject in `localStorage` (`cs_mcq_hub_<id>_v1`) with automatic migration from legacy keys.

### 2. Five Study & Exam Modes
- **📖 Study Bank:** Browse all questions with answers and detailed explanations (`exp` / `explanation`) unlocked immediately.
- **✍️ Sequential Quiz:** Practice question-by-question with instant grading, single-card `Show Answer` reveals, deterministic option shuffling (`🔀 Shuffle`), and an inline `↺ Reset Quiz` button backed by a 6-second `↺ Undo` recovery toast.
- **🎲 Mock Exam:** Generate randomized exams (10, 25, 50, or 100 questions) filtered by difficulty, supporting both **Instant Feedback** and **Exam Mode** (graded upon submission).
- **❌ Missed / Wrong Review:** Automatically collects wrong answers from Sequential Quiz and Mock Exams; includes `🔄 Retry Missed` (auto-removes questions once answered correctly), per-card `✓ Done`, and `🧹 Clear All` with Undo.
- **⭐ Saved Review:** Bookmark tricky questions (`☆ Save`) for focused revision or self-quizzing via `✍️ Practice Saved`.

### 3. Data Portability, Issue Reporting & Custom Bank Upload
- **Progress Export & Import (`.json`):** Back up your subject progress with `⬇ Export` or restore/transfer progress across devices with `⬆ Import` (includes 6-second Undo rollback).
- **One-Click Question Issue Reporting:** Every question card includes a `⚑ Report` button that opens a prefilled GitHub issue containing the subject, question number, stem, options, and current answer key.
- **In-Browser Bank Upload & Validator:** Drag-and-drop or upload custom `.json` or `.js` question banks (up to 10 MB) in the browser with schema validation, syntax checking, and downloadable starter templates.

### 4. Smart Difficulty Classification & Rich Explanations
- **3-Tier Structural Difficulty Classifier:** Honors explicit `"difficulty"` tags (`easy`, `medium`, `hard`) when provided and automatically classifies untagged questions using structural and quantitative heuristics.
- **Structured Explanations:** Normalizes `exp`, `explanation`, and `feedback` fields into clean `💡 Explanation` callouts inside every answer banner.

### 5. Offline PWA, Accessibility & Mobile Navigation
- **Offline-Ready PWA:** When served over HTTPS or `localhost`, `pwa.js` registers `sw.js` to pre-cache the app shell, handle `quiz.html?subject=<id>` offline via `ignoreSearch`, and cache visited question banks using Stale-While-Revalidate (automatically skipped on `file://`).
- **Accessible & Touch-Friendly UI:** Semantic `<button>` MCQ options with `✓`/`✗` indicators, `inert` focus management on modals and the collapsible sidebar, `44px` minimum touch targets, and a persistent Light / Dark theme (`theme.js`).
- **Floating Quick-Nav Dock:** Thumb-accessible `Next ↓` and `↑ Top` pill buttons anchored in the bottom-right corner that automatically advance across paginated batches.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `N` / `J` / `↓` | Advance & smooth-scroll to the next question |
| `K` / `↑` | Move focus up to the previous question |
| `A` – `D` or `1` – `4` | Select Option A, B, C, or D on the focused card |
| `T` | Scroll back to the top & focus the first question |
| `S` | Bookmark / unsave the focused question |
| `E` | Reveal the answer in Sequential Quiz mode |
| `/` | Open sidebar and focus the keyword search input |
| `[` | Collapse or expand the navigation sidebar |
| `?` / `Esc` | Open interactive shortcuts modal / close active modal |

---

## ➕ Adding & Validating a New Subject Bank

1. **Create the data file** inside `data/sem-7/`, `data/sem-8/`, or `data/core-cs/` (e.g., `data/sem-7/automata.js`):

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

*(Optional fields per question: `difficulty: "easy" | "medium" | "hard"`, `topic: "<topic-id>"`, `week: 1`. You may also use `window.EXAM_DATA = { id, courseCode, title, subtitle, topics, mcqs }` for custom topic filter chips.)*

2. **Register or enable the subject** in `assets/js/subjects-data.js`:

```javascript
{
  id: "automata",
  title: "Theory of Automata",
  courseCode: "CS-311",
  track: "Active Track",
  status: "Exam Prep",
  icon: "⚙️",
  description: "DFAs, NFAs, Regular Expressions, CFGs & Turing Machines",
  ready: true,
  questionCount: 150,
  dataFile: "data/sem-7/automata.js"
}
```

*(If creating an empty placeholder file before MCQs are added, keep `ready: false` so the catalog and CI validator treat it as an upcoming subject.)*

3. **Validate locally before pushing** (also runs automatically in GitHub Actions via `.github/workflows/validate-banks.yml`):

```bash
node scripts/validate-banks.js
```