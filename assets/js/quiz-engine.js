/* ==========================================================================
   CS MCQ Hub — Universal Quiz & Review Engine (Phase 2)
   Supports dynamic subject loading via ?subject=<id>, validated local upload,
   sample template downloads, and interactive keyboard shortcuts modal.
   ========================================================================== */




let ACTIVE_SUBJECT_ID = 'default';
let EXAM_META = {
  id: 'default',
  courseCode: 'CS-HUB',
  title: 'CS MCQ Practice',
  subtitle: 'Interactive MCQ Practice & Exam Review'
};

let MCQS_LIST = [];
let TOPICS_CONFIG = [];
let TOPIC_FULL = {};
let TOPIC_SHORT = {};
let TOPIC_REGEXES = [];

const TOPIC_MAP = {};
const DIFFICULTY_MAP = {};
const DIFF_COUNTS = { all: 0, easy: 0, medium: 0, hard: 0 };

let currentMode = 'study';
let currentDifficulty = 'all';
let currentTopic = 'all';
let searchQuery = '';
let shuffleOptionsEnabled = false;
let activeCardIndex = 0;
let currentPage = 1;
let perPage = 50;

let missedRetryMode = false;
let missedRetryAnswers = {};
let savedPracticeMode = false;
let savedPracticeAnswers = {};

let undoBackup = null;
let undoTimer = null;
let activeSampleTab = 'json';
let programmaticScrollUntil = 0;

let state = { selected: {}, revealed: {}, missed: {}, bookmarked: {} };

let mockState = {
  active: false,
  count: 25,
  difficulty: 'all',
  feedbackMode: 'instant',
  questions: [],
  answers: {},
  submitted: false
};

/* --------------------------------------------------------------------------
   1. Sample Templates for Upload Modal (.json & .js)
   -------------------------------------------------------------------------- */
const SAMPLE_JSON_TEXT = `{
  "id": "os-sample",
  "courseCode": "CS-302",
  "title": "Operating Systems — Sample Bank",
  "subtitle": "Process Scheduling, Deadlocks & Virtual Memory",
  "topics": [
    { "id": "sched", "label": "CPU Scheduling", "short": "Scheduling", "pattern": "(round robin|fcfs|sjf|scheduling|quantum)" },
    { "id": "mem", "label": "Memory & Deadlocks", "short": "Memory", "pattern": ".*" }
  ],
  "mcqs": [
    {
      "num": 1,
      "q": "Which CPU scheduling algorithm allocates a fixed time quantum to each process in cyclic order?",
      "A": "First-Come, First-Served (FCFS)",
      "B": "Shortest Job First (SJF)",
      "C": "Round Robin (RR)",
      "D": "Priority Scheduling",
      "ans": "C",
      "difficulty": "easy",
      "explanation": "Round Robin assigns each ready process an equal time slice (quantum) in FIFO circular order."
    },
    {
      "num": 2,
      "q": "Which condition is NOT one of the four Coffman necessary conditions for deadlock?",
      "A": "Mutual Exclusion",
      "B": "Hold and Wait",
      "C": "Preemptive Resource Allocation",
      "D": "Circular Wait",
      "ans": "C",
      "difficulty": "medium",
      "explanation": "Deadlock requires Non-Preemption (resources cannot be forcibly taken), along with Mutual Exclusion, Hold & Wait, and Circular Wait."
    },
    {
      "num": 3,
      "q": "In virtual memory systems, what hardware component caches recent virtual-to-physical page translations?",
      "A": "Translation Lookaside Buffer (TLB)",
      "B": "Arithmetic Logic Unit (ALU)",
      "C": "Instruction Register (IR)",
      "D": "DMA Controller",
      "ans": "A",
      "difficulty": "medium",
      "explanation": "The TLB is a high-speed associative cache inside the MMU that accelerates page table lookups."
    }
  ]
}`;

const SAMPLE_JS_TEXT = `window.EXAM_DATA = {
  id: "cn-sample",
  courseCode": "CS-305",
  title: "Computer Networks — Sample Bank",
  subtitle: "OSI Model, TCP/IP, Routing & Congestion Control",
  topics: [
    { id: "transport", label: "Transport Layer", short: "Transport", pattern: "(tcp|udp|handshake|congestion|port)" },
    { id: "network", label: "Network & Routing", short: "Network", pattern: ".*" }
  ],
  mcqs: [
    {
      num: 1,
      q: "Which transport layer protocol provides connection-oriented, reliable, ordered byte-stream delivery?",
      A: "UDP",
      B: "TCP",
      C: "ICMP",
      D: "ARP",
      ans: "B",
      difficulty: "easy",
      explanation: "TCP uses a three-way handshake, sequence numbers, and acknowledgments to guarantee reliable delivery."
    },
    {
      num: 2,
      q: "What is the primary purpose of ARP (Address Resolution Protocol)?",
      A: "Translate domain names into IPv4 addresses",
      B: "Map a known IPv4 address to its physical MAC address on a LAN",
      C: "Assign dynamic IP addresses to booting hosts",
      D: "Encrypt HTTP traffic over port 443",
      ans: "B",
      difficulty: "medium",
      explanation: "ARP broadcasts a request on the local subnet to resolve an IPv4 address into a Layer-2 MAC address."
    },
    {
      num: 3,
      q: "During TCP congestion control, how does the congestion window (cwnd) grow in the Slow Start phase?",
      A: "Linearly by 1 MSS per RTT",
      B: "Exponentially by doubling every RTT",
      C: "Remains constant until packet loss",
      D: "Halves on every received ACK",
      ans: "B",
      difficulty: "hard",
      explanation: "In Slow Start, cwnd increases by 1 MSS for each ACK received, effectively doubling cwnd every round-trip time (RTT)."
    }
  ]
};`;

/* --------------------------------------------------------------------------
   2. Subject Discovery & Dynamic Data Loading
   -------------------------------------------------------------------------- */
function getRequestedSubjectId() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('subject') || params.get('id') || params.get('exam') || 'pdc').trim();
}

function getRegistryCandidates() {
  const lists = [];
  if (typeof SUBJECTS !== 'undefined') lists.push(SUBJECTS);
  if (typeof window.SUBJECTS !== 'undefined') lists.push(window.SUBJECTS);
  if (typeof SUBJECTS_DATA !== 'undefined') lists.push(SUBJECTS_DATA);
  if (typeof window.SUBJECTS_DATA !== 'undefined') lists.push(window.SUBJECTS_DATA);
  if (typeof subjects !== 'undefined') lists.push(subjects);
  if (typeof window.subjects !== 'undefined') lists.push(window.subjects);
  if (typeof EXAM_CATALOG !== 'undefined') lists.push(EXAM_CATALOG);
  if (typeof window.EXAM_CATALOG !== 'undefined') lists.push(window.EXAM_CATALOG);
  return lists;
}

function findSubjectEntry(subjectId) {
  const needle = subjectId.toLowerCase();
  for (const reg of getRegistryCandidates()) {
    if (Array.isArray(reg)) {
      const found = reg.find(item =>
        item && (
          String(item.id || '').toLowerCase() === needle ||
          String(item.slug || '').toLowerCase() === needle
        )
      );
      if (found) return found;
    } else if (reg && typeof reg === 'object') {
      if (reg[subjectId]) return Object.assign({ id: subjectId }, reg[subjectId]);
      if (reg[needle]) return Object.assign({ id: needle }, reg[needle]);
    }
  }
  return null;
}

function resolveCandidatePaths(subjectId, registryEntry) {
  const paths = [];
  if (registryEntry) {
    const explicit = registryEntry.dataFile || registryEntry.file || registryEntry.path || registryEntry.dataPath || registryEntry.src;
    if (explicit) paths.push(explicit);
  }
  paths.push(`data/sem-7/${subjectId}.js`);
  paths.push(`data/sem-8/${subjectId}.js`);
  paths.push(`data/core-cs/${subjectId}.js`);
  return [...new Set(paths)];
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(src);
    script.onerror = () => {
      script.remove();
      reject(new Error(`Could not load ${src}`));
    };
    document.head.appendChild(script);
  });
}

function extractLoadedDataset(subjectId, registryEntry) {
  const rawObj = window.EXAM_DATA || window.QUIZ_DATA || window.SUBJECT_DATA || null;
  let rawMcqs = null;

  if (rawObj && Array.isArray(rawObj.mcqs)) {
    rawMcqs = rawObj.mcqs;
  } else if (rawObj && Array.isArray(rawObj.questions)) {
    rawMcqs = rawObj.questions;
  } else if (typeof MCQS !== 'undefined' && Array.isArray(MCQS)) {
    rawMcqs = MCQS;
  } else if (Array.isArray(window.MCQS)) {
    rawMcqs = window.MCQS;
  }

  const title = (rawObj && rawObj.title) || (registryEntry && (registryEntry.title || registryEntry.name)) || subjectId.toUpperCase();
  const courseCode = (rawObj && (rawObj.courseCode || rawObj.code)) || (registryEntry && (registryEntry.courseCode || registryEntry.code)) || 'CS-HUB';
  const subtitle = (rawObj && rawObj.subtitle) || (registryEntry && (registryEntry.subtitle || registryEntry.description)) || 'Interactive MCQ Practice, Mock Exams & Mistake Review';
  const topics = (rawObj && Array.isArray(rawObj.topics)) ? rawObj.topics : [];

  return {
    id: subjectId,
    title,
    courseCode,
    subtitle,
    topics,
    mcqs: rawMcqs || []
  };
}

function normalizeMcqItem(item, index) {
  const opts = item.options || {};
  const rawExp = item.explanation ?? item.exp ?? item.feedback ?? '';
  return {
    num: item.num != null ? Number(item.num) : index + 1,
    week: item.week != null ? Number(item.week) : null,
    q: String(item.q || item.question || ''),
    A: String(item.A ?? opts.A ?? ''),
    B: String(item.B ?? opts.B ?? ''),
    C: String(item.C ?? opts.C ?? ''),
    D: String(item.D ?? opts.D ?? ''),
    ans: String(item.ans || item.answer || 'A').trim().toUpperCase(),
    explanation: rawExp ? String(rawExp).trim() : '',
    difficulty: item.difficulty ? String(item.difficulty).toLowerCase().trim() : '',
    topic: item.topic ? String(item.topic).trim() : ''
  };
}


function inferDifficulty(item) {
  if (['easy', 'medium', 'hard'].includes(item.difficulty)) return item.difficulty;

  const qRaw = item.q.trim();
  const qLower = qRaw.toLowerCase();
  const fullText = `${item.q} ${item.A} ${item.B} ${item.C} ${item.D}`;

  // 1. HARD: Calculations, dimensions, Big-O/formulas, units, or quantitative stems
  const hasMathOrUnits =
    /(\b\d+\.\d+\b|\b\d+e[+-]?\d+\b|\b\d+\s*[x×*]\s*\d+\b|\bO\([^)]+\)|\b\d+\s*(%|ms|s|kb|mb|gb|tb|bytes|bits|hz|khz|mhz|ghz|kbps|mbps|gbps)\b)/i.test(fullText);

  const hasQuantitativeStem =
    /\b(how many|how much|calculate|compute|derive|to (two|three|four) decimal places|by what factor|by roughly what factor|what is the (value|output|shape|size|complexity|speedup|efficiency|throughput|latency|probability|loss|gradient|accuracy|precision|recall|f1|variance|standard deviation|learning rate|saving))\b/i.test(qLower);

  if (hasMathOrUnits || hasQuantitativeStem) {
    return 'hard';
  }

  // 2. EASY: Direct single-clause recall/definition stems without negations or numbers
  const hasNegation = /\b(NOT|EXCEPT|NEVER|FALSE)\b/.test(qRaw);
  const hasDigits = /\d/.test(qRaw);
  const isDirectRecallStem =
    /^(what is (a |an |the )?(main |primary |core |basic |key )?(purpose|role|definition|goal|function|advantage|meaning)|what does|what do|which (protocol|layer|algorithm|data structure|component|method|function|statement|term|type|mode|split|pair)|define|in [a-z\s-]+, what is)\b/i.test(qRaw);

  if (!hasNegation && !hasDigits && (isDirectRecallStem || qRaw.length <= 92)) {
    return 'easy';
  }

  // 3. MEDIUM: Conceptual trade-offs, diagnostics, multi-clause scenarios & negation questions
  return 'medium';
}

function initializeDataset(dataset) {
  ACTIVE_SUBJECT_ID = dataset.id;
  EXAM_META = {
    id: dataset.id,
    courseCode: dataset.courseCode,
    title: dataset.title,
    subtitle: dataset.subtitle
  };
  MCQS_LIST = dataset.mcqs.map(normalizeMcqItem);
  TOPICS_CONFIG = dataset.topics || [];

  TOPIC_FULL = {};
  TOPIC_SHORT = {};
  TOPIC_REGEXES = [];

  for (const t of TOPICS_CONFIG) {
    TOPIC_FULL[t.id] = t.label;
    TOPIC_SHORT[t.id] = t.short || t.label;
    try {
      TOPIC_REGEXES.push({ id: t.id, regex: new RegExp(t.pattern, 'i') });
    } catch (e) {}
  }

  DIFF_COUNTS.all = MCQS_LIST.length;
  DIFF_COUNTS.easy = 0;
  DIFF_COUNTS.medium = 0;
  DIFF_COUNTS.hard = 0;

  for (const item of MCQS_LIST) {
    if (item.topic && TOPIC_FULL[item.topic]) {
      TOPIC_MAP[item.num] = item.topic;
    } else if (TOPIC_REGEXES.length > 0) {
      const combined = `${item.q} ${item.A} ${item.B} ${item.C} ${item.D}`;
      const matched = TOPIC_REGEXES.find(tr => tr.regex.test(combined));
      TOPIC_MAP[item.num] = matched ? matched.id : TOPIC_REGEXES[0].id;
    } else {
      TOPIC_MAP[item.num] = 'general';
    }

    const d = inferDifficulty(item);
    DIFFICULTY_MAP[item.num] = d;
    DIFF_COUNTS[d]++;
  }

  loadSubjectProgress();
  applyHeaderAndTopicUI();
  render();
}

function applyHeaderAndTopicUI() {
  const total = MCQS_LIST.length;
  document.title = `${EXAM_META.title} (${total} MCQs) — CS MCQ Hub`;
  document.getElementById('sb-course-title').textContent = EXAM_META.title;
  document.getElementById('sb-total-sub').textContent = `${EXAM_META.courseCode} • ${total} MCQs`;
  document.getElementById('study-total-pill').textContent = total;
  document.getElementById('count-all').textContent = total;
  document.getElementById('count-easy').textContent = DIFF_COUNTS.easy;
  document.getElementById('count-medium').textContent = DIFF_COUNTS.medium;
  document.getElementById('count-hard').textContent = DIFF_COUNTS.hard;

  document.getElementById('hero-code').textContent = `${EXAM_META.courseCode} • ${total} MCQS`;
  document.getElementById('hero-title').textContent = EXAM_META.title;
  document.getElementById('hero-sub').textContent = EXAM_META.subtitle;

  const topicBar = document.getElementById('topic-filter-bar');
  if (TOPICS_CONFIG.length > 0) {
    topicBar.style.display = 'flex';
    let chipsHtml = `<button class="topic-chip active" data-topic="all" onclick="setTopic('all')">All Topics (${total})</button>`;
    for (const t of TOPICS_CONFIG) {
      chipsHtml += `<button class="topic-chip" data-topic="${escapeHtml(t.id)}" onclick="setTopic('${escapeHtml(t.id)}')">${escapeHtml(t.label)}</button>`;
    }
    topicBar.innerHTML = chipsHtml;
  } else {
    topicBar.style.display = 'none';
    topicBar.innerHTML = '';
  }
}

/* --------------------------------------------------------------------------
   3. Modals: Upload Format Guide + Interactive Keyboard Shortcuts
   -------------------------------------------------------------------------- */
function openUploadModal() {
  closeModals();
  closeMobileSidebar();
  switchSampleTab(activeSampleTab);
  const fb = document.getElementById('upload-feedback');
  if (fb) { fb.style.display = 'none'; fb.textContent = ''; }
  document.getElementById('upload-modal').classList.add('open');
}

function openKbdModal() {
  closeModals();
  closeMobileSidebar();
  document.getElementById('kbd-modal').classList.add('open');
}

function closeModals() {
  document.querySelectorAll('.hub-modal-backdrop').forEach(el => el.classList.remove('open'));
}

function switchSampleTab(type) {
  activeSampleTab = type;
  document.getElementById('sample-tab-json').classList.toggle('active', type === 'json');
  document.getElementById('sample-tab-js').classList.toggle('active', type === 'js');
  document.getElementById('sample-code-block').textContent = type === 'json' ? SAMPLE_JSON_TEXT : SAMPLE_JS_TEXT;
}

function copySampleCode() {
  const text = activeSampleTab === 'json' ? SAMPLE_JSON_TEXT : SAMPLE_JS_TEXT;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-sample-btn');
    btn.textContent = '✅ Copied';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1600);
  });
}

function downloadSampleFile(type) {
  const isJson = type === 'json';
  const content = isJson ? SAMPLE_JSON_TEXT : SAMPLE_JS_TEXT;
  const blob = new Blob([content], { type: isJson ? 'application/json' : 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = isJson ? 'sample-mcqs.json' : 'sample-mcqs.js';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showUploadFeedback(type, msg) {
  const fb = document.getElementById('upload-feedback');
  fb.className = `upload-feedback ${type}`;
  fb.textContent = msg;
  fb.style.display = 'block';
}

function validateMcqArray(mcqs) {
  if (!Array.isArray(mcqs) || mcqs.length === 0) {
    return 'No questions found. Make sure your file provides a non-empty "mcqs" array (or root JSON array).';
  }
  const validAnswers = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < mcqs.length; i++) {
    const m = mcqs[i];
    const label = `Question #${m && m.num != null ? m.num : i + 1}`;
    if (!m || typeof m !== 'object') return `${label} is not a valid object.`;
    if (!String(m.q || m.question || '').trim()) return `${label} is missing question text ("q").`;
    const opts = m.options || {};
    for (const letter of validAnswers) {
      const val = m[letter] ?? opts[letter];
      if (val === undefined || val === null || String(val).trim() === '') {
        return `${label} is missing option "${letter}". All 4 options (A, B, C, D) are required.`;
      }
    }
    const ans = String(m.ans || m.answer || '').trim().toUpperCase();
    if (!validAnswers.includes(ans)) {
      return `${label} has invalid "ans": "${m.ans}". Must be "A", "B", "C", or "D".`;
    }
  }
  return null;
}

function processUploadedFile(file) {
  if (!file) return;
  if (!/\.(js|json)$/i.test(file.name)) {
    showUploadFeedback('error', 'Unsupported file type. Please upload a .json or .js file.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showUploadFeedback('error', 'File exceeds the 10 MB size limit.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = String(e.target.result || '');
    const cleanId = file.name.replace(/\.(js|json)$/i, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    try {
      let datasetObj = null;

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(content);
        const mcqs = Array.isArray(parsed) ? parsed : (parsed.mcqs || parsed.questions || []);
        const err = validateMcqArray(mcqs);
        if (err) { showUploadFeedback('error', `Validation Error: ${err}`); return; }

        datasetObj = {
          id: parsed.id || cleanId || 'uploaded-bank',
          title: parsed.title || file.name,
          courseCode: parsed.courseCode || 'LOCAL-JSON',
          subtitle: parsed.subtitle || `Loaded from ${file.name}`,
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          mcqs
        };
      } else {
        if (/^\s*(import|export)\s+/m.test(content)) {
          showUploadFeedback('error', 'ES module "import/export" syntax is not supported. Assign window.EXAM_DATA = { ... } or const MCQS = [ ... ].');
          return;
        }
        const sandbox = {};
        const runner = new Function('window', `${content}\n; return { exam: window.EXAM_DATA || window.QUIZ_DATA || null, mcqs: typeof MCQS !== 'undefined' ? MCQS : (window.MCQS || null) };`);
        const out = runner(sandbox);
        const mcqs = (out.exam && (out.exam.mcqs || out.exam.questions)) || out.mcqs || [];
        const err = validateMcqArray(mcqs);
        if (err) { showUploadFeedback('error', `Validation Error: ${err}`); return; }

        datasetObj = {
          id: (out.exam && out.exam.id) || cleanId || 'uploaded-bank',
          title: (out.exam && out.exam.title) || file.name,
          courseCode: (out.exam && (out.exam.courseCode || out.exam.code)) || 'LOCAL-JS',
          subtitle: (out.exam && out.exam.subtitle) || `Loaded from ${file.name}`,
          topics: (out.exam && Array.isArray(out.exam.topics)) ? out.exam.topics : [],
          mcqs
        };
      }

      initializeDataset(datasetObj);
      currentMode = 'study';
      currentTopic = 'all';
      currentDifficulty = 'all';
      currentPage = 1;
      showUploadFeedback('success', `✅ Loaded "${datasetObj.title}" (${datasetObj.mcqs.length} MCQs)!`);
      setTimeout(() => closeModals(), 700);
    } catch (err) {
      showUploadFeedback('error', `Syntax Error in ${file.name}: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function handleFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  processUploadedFile(file);
  event.target.value = '';
}

function handleFileDrop(event) {
  event.preventDefault();
  document.getElementById('upload-dropzone').classList.remove('dragover');
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  processUploadedFile(file);
}

function highlightModalKey(pressedKey) {
  const k = pressedKey.toLowerCase();
  document.querySelectorAll('#kbd-modal .kbd-item-btn').forEach(btn => {
    const keys = (btn.dataset.keys || '').split(',');
    if (keys.includes(k)) {
      btn.classList.add('key-lit');
      setTimeout(() => btn.classList.remove('key-lit'), 420);
    }
  });
}

function demoShortcutAction(action) {
  closeModals();
  if (action === 'sidebar') { toggleSidebar(); return; }
  if (action === 'top') { scrollToTop(); return; }
  if (action === 'search') {
    if (window.innerWidth <= 920) document.body.classList.add('mobile-sidebar-open');
    else document.body.classList.remove('sidebar-collapsed');
    const sb = document.getElementById('search-box');
    if (sb) sb.focus();
    return;
  }
  const cards = document.querySelectorAll('#mcq-list .mcq-card');
  if (!cards.length) return;
  if (action === 'next') {
    goToNextQuestion();
  } else if (action === 'prev') {
    activeCardIndex = Math.max(0, activeCardIndex - 1);
    highlightActiveCard();
    programmaticScrollUntil = Date.now() + 700;
    cards[activeCardIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (action === 'save') {
    toggleBookmark(parseInt(cards[activeCardIndex].dataset.num, 10));
  } else if (action === 'reveal') {
    if (currentMode !== 'practice') setMode('practice');
    toggleRevealSingle(parseInt(cards[activeCardIndex].dataset.num, 10));
  } else if (action === 'option') {
    if (currentMode === 'study') setMode('practice');
    const updatedCards = document.querySelectorAll('#mcq-list .mcq-card');
    const opt = updatedCards[activeCardIndex] && updatedCards[activeCardIndex].querySelector('.mcq-option');
    if (opt) opt.click();
  }
}

/* --------------------------------------------------------------------------
   4. Per-Subject LocalStorage Persistence
   -------------------------------------------------------------------------- */
function getStorageKey() {
  return `cs_mcq_hub_${ACTIVE_SUBJECT_ID}_v1`;
}

function loadSubjectProgress() {
  state = { selected: {}, revealed: {}, missed: {}, bookmarked: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(getStorageKey()));
    if (saved && typeof saved === 'object') {
      state.selected = saved.selected || {};
      state.revealed = saved.revealed || {};
      state.missed = saved.missed || {};
      state.bookmarked = saved.bookmarked || {};
    }
  } catch (e) {}
}

function saveState() {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch (e) {}
}

/* --------------------------------------------------------------------------
   5. Sidebar, Toast & Helpers
   -------------------------------------------------------------------------- */
function toggleSidebar() {
  if (window.innerWidth <= 920) {
    document.body.classList.toggle('mobile-sidebar-open');
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
}

function closeMobileSidebar() {
  document.body.classList.remove('mobile-sidebar-open');
}

function showUndoToast(message, type, snapshot) {
  if (undoTimer) clearTimeout(undoTimer);
  undoBackup = { type, snapshot };
  const area = document.getElementById('undo-toast-area');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="undo-toast">
      <span>${escapeHtml(message)}</span>
      <button class="undo-btn" onclick="triggerUndo()">↺ Undo</button>
    </div>
  `;
  undoTimer = setTimeout(() => {
    area.style.display = 'none';
    undoBackup = null;
  }, 6000);
}

function triggerUndo() {
  if (!undoBackup) return;
  if (undoBackup.type === 'missed') {
    state.missed = undoBackup.snapshot;
  } else if (undoBackup.type === 'bookmarked') {
    state.bookmarked = undoBackup.snapshot;
  } else if (undoBackup.type === 'progress') {
    state.selected = undoBackup.snapshot.selected || {};
    state.revealed = undoBackup.snapshot.revealed || {};
  }
  saveState();
  undoBackup = null;
  if (undoTimer) clearTimeout(undoTimer);
  document.getElementById('undo-toast-area').style.display = 'none';
  render();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDisplayedOptions(item) {
  const base = ['A', 'B', 'C', 'D'];
  if (!shuffleOptionsEnabled) {
    return base.map(origLetter => ({ displayLetter: origLetter, origLetter, text: item[origLetter] }));
  }
  const perms = [
    ['B', 'D', 'A', 'C'],
    ['C', 'A', 'D', 'B'],
    ['D', 'C', 'B', 'A'],
    ['A', 'D', 'B', 'C']
  ];
  const order = perms[item.num % perms.length];
  return order.map((origLetter, idx) => ({
    displayLetter: base[idx],
    origLetter,
    text: item[origLetter]
  }));
}

function toggleShuffleOptions() {
  shuffleOptionsEnabled = !shuffleOptionsEnabled;
  const btn = document.getElementById('shuffle-opt-btn');
  btn.classList.toggle('active-on', shuffleOptionsEnabled);
  btn.textContent = shuffleOptionsEnabled ? '🔀 Shuffled' : '🔀 Shuffle';
  render();
}

function renderExplanationHtml(item) {
  if (item.explanation) {
    return `
      <div class="exp-block">
        <span class="exp-label">💡 Explanation</span>
        <p class="exp-text">${escapeHtml(item.explanation)}</p>
      </div>
    `;
  }
  return `<span class="takeaway-note">Key Concept: ${escapeHtml(item[item.ans])}</span>`;
}

/* --------------------------------------------------------------------------
   6. Mode, Filter & Pagination Controls
   -------------------------------------------------------------------------- */
function setMode(mode) {
  currentMode = mode;
  currentPage = 1;
  activeCardIndex = 0;

  if (mode !== 'missed') { missedRetryMode = false; missedRetryAnswers = {}; }
  if (mode !== 'bookmarked') { savedPracticeMode = false; savedPracticeAnswers = {}; }

  ['study', 'practice', 'mock', 'missed', 'bookmarked'].forEach(m => {
    const el = document.getElementById(`mode-${m}`);
    if (el) el.classList.toggle('active', m === mode);
  });

  const isMock = mode === 'mock';
  const isReviewMode = mode === 'missed' || mode === 'bookmarked';

  document.getElementById('standard-stats-bar').style.display = isMock ? 'none' : 'flex';
  document.getElementById('sb-diff-section').style.display = isMock ? 'none' : 'block';
  document.getElementById('sb-tools-section').style.display = isMock ? 'none' : 'block';
  if (TOPICS_CONFIG.length > 0) {
    document.getElementById('topic-filter-bar').style.display = isMock ? 'none' : 'flex';
  }
  document.getElementById('mock-area').style.display = isMock ? 'block' : 'none';
  document.getElementById('review-header-area').style.display = isReviewMode ? 'block' : 'none';

  closeMobileSidebar();
  render();
}

function setTopic(topic) {
  currentTopic = topic;
  currentPage = 1;
  activeCardIndex = 0;
  document.querySelectorAll('#topic-filter-bar .topic-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.topic === topic);
  });
  if (currentMode === 'mock') { setMode('study'); return; }
  render();
}

function setDifficulty(diff) {
  currentDifficulty = diff;
  currentPage = 1;
  activeCardIndex = 0;
  ['all', 'easy', 'medium', 'hard'].forEach(d => {
    const el = document.getElementById(`diff-${d}`);
    if (el) el.classList.toggle('active', d === diff);
  });
  closeMobileSidebar();
  render();
}

function onSearch() {
  searchQuery = document.getElementById('search-box').value;
  currentPage = 1;
  activeCardIndex = 0;
  render();
}

function changePerPage(val) {
  perPage = parseInt(val, 10);
  currentPage = 1;
  activeCardIndex = 0;
  render();
}

function jumpToBatch(pageNum) {
  currentPage = parseInt(pageNum, 10);
  activeCardIndex = 0;
  render();
  programmaticScrollUntil = Date.now() + 700;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAllFilters() {
  currentTopic = 'all';
  currentDifficulty = 'all';
  searchQuery = '';
  currentPage = 1;
  document.getElementById('search-box').value = '';
  document.querySelectorAll('#topic-filter-bar .topic-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.topic === 'all');
  });
  ['all', 'easy', 'medium', 'hard'].forEach(d => {
    const el = document.getElementById(`diff-${d}`);
    if (el) el.classList.toggle('active', d === 'all');
  });
  render();
}

function getFilteredList() {
  const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
  return MCQS_LIST.filter(item => {
    if (currentMode === 'bookmarked' && !state.bookmarked[item.num]) return false;
    if (currentMode === 'missed' && !state.missed[item.num]) return false;
    if (currentTopic !== 'all' && TOPIC_MAP[item.num] !== currentTopic) return false;
    if (currentDifficulty !== 'all' && DIFFICULTY_MAP[item.num] !== currentDifficulty) return false;
    if (!q) return true;
    return (
      String(item.num) === q ||
      item.q.toLowerCase().includes(q) ||
      item.A.toLowerCase().includes(q) ||
      item.B.toLowerCase().includes(q) ||
      item.C.toLowerCase().includes(q) ||
      item.D.toLowerCase().includes(q) ||
      (item.explanation && item.explanation.toLowerCase().includes(q))
    );
  });
}

/* --------------------------------------------------------------------------
   7. Answering, Bookmarking & Review Actions
   -------------------------------------------------------------------------- */
function selectOption(num, origLetter) {
  if (currentMode === 'study') return;

  if (currentMode === 'mock') {
    if (mockState.submitted || mockState.answers[num]) return;
    mockState.answers[num] = origLetter;
    if (mockState.feedbackMode === 'instant') {
      const qObj = MCQS_LIST.find(m => m.num === num);
      if (qObj && origLetter !== qObj.ans) {
        state.missed[num] = origLetter;
        saveState();
      }
    }
    render();
    return;
  }

  if (currentMode === 'missed' && missedRetryMode) {
    if (missedRetryAnswers[num]) return;
    missedRetryAnswers[num] = origLetter;
    const qObj = MCQS_LIST.find(m => m.num === num);
    if (qObj) {
      if (origLetter === qObj.ans) delete state.missed[num];
      else state.missed[num] = origLetter;
      saveState();
    }
    render();
    return;
  }

  if (currentMode === 'bookmarked' && savedPracticeMode) {
    if (savedPracticeAnswers[num]) return;
    savedPracticeAnswers[num] = origLetter;
    const qObj = MCQS_LIST.find(m => m.num === num);
    if (qObj && origLetter !== qObj.ans) {
      state.missed[num] = origLetter;
      saveState();
    }
    render();
    return;
  }

  if (currentMode === 'practice') {
    if (state.selected[num] || state.revealed[num]) return;
    state.selected[num] = origLetter;
    const qObj = MCQS_LIST.find(m => m.num === num);
    if (qObj && origLetter !== qObj.ans) state.missed[num] = origLetter;
    saveState();
    render();
  }
}

function toggleRevealSingle(num) {
  if (state.selected[num] || state.revealed[num]) return;
  state.revealed[num] = true;
  saveState();
  render();
}

function toggleBookmark(num) {
  if (state.bookmarked[num]) {
    delete state.bookmarked[num];
    delete savedPracticeAnswers[num];
  } else {
    state.bookmarked[num] = true;
  }
  saveState();
  render();
}

function clearMissedSingle(num) {
  delete state.missed[num];
  delete missedRetryAnswers[num];
  saveState();
  render();
}

function clearAllMissed() {
  const snapshot = Object.assign({}, state.missed);
  const count = Object.keys(snapshot).length;
  if (!count) return;
  state.missed = {};
  missedRetryMode = false;
  missedRetryAnswers = {};
  saveState();
  render();
  showUndoToast(`Cleared ${count} missed question${count > 1 ? 's' : ''}.`, 'missed', snapshot);
}

function toggleMissedRetry() {
  missedRetryMode = !missedRetryMode;
  missedRetryAnswers = {};
  render();
}

function clearSavedSingle(num) {
  delete state.bookmarked[num];
  delete savedPracticeAnswers[num];
  saveState();
  render();
}

function clearAllSaved() {
  const snapshot = Object.assign({}, state.bookmarked);
  const count = Object.keys(snapshot).length;
  if (!count) return;
  state.bookmarked = {};
  savedPracticeMode = false;
  savedPracticeAnswers = {};
  saveState();
  render();
  showUndoToast(`Cleared ${count} saved question${count > 1 ? 's' : ''}.`, 'bookmarked', snapshot);
}

function toggleSavedPractice() {
  savedPracticeMode = !savedPracticeMode;
  savedPracticeAnswers = {};
  render();
}

function resetProgress() {
  const answeredCount = Object.keys(state.selected).length + Object.keys(state.revealed).length;
  if (answeredCount === 0) {
    showUndoToast('Sequential Quiz is already at 0 / ' + MCQS_LIST.length + '.', 'progress', { selected: {}, revealed: {} });
    return;
  }
  const snapshot = {
    selected: Object.assign({}, state.selected),
    revealed: Object.assign({}, state.revealed)
  };
  state.selected = {};
  state.revealed = {};
  activeCardIndex = 0;
  saveState();
  render();
  showUndoToast(`Reset Sequential Quiz progress (${answeredCount} cleared).`, 'progress', snapshot);
}

/* --------------------------------------------------------------------------
   8. Stats, Card Rendering & Mock Exam
   -------------------------------------------------------------------------- */
function updateStats(filteredCount, startIdx, endIdx) {
  const total = MCQS_LIST.length;
  let correct = 0;
  let wrong = 0;
  for (const item of MCQS_LIST) {
    const picked = state.selected[item.num];
    if (picked) {
      if (picked === item.ans) correct++;
      else wrong++;
    }
  }
  const answered = correct + wrong;
  const savedCount = Object.keys(state.bookmarked).length;
  const missedCount = Object.keys(state.missed).length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  document.getElementById('saved-count').textContent = savedCount;
  document.getElementById('quiz-progress-pill').textContent = `${answered}/${total}`;

  const missedBadgeEl = document.getElementById('missed-count');
  missedBadgeEl.textContent = missedCount;
  missedBadgeEl.classList.toggle('alert-count', missedCount > 0 && currentMode !== 'missed');

  document.getElementById('correct-badge').innerHTML = `✅ <span class="desktop-only">Correct: </span>${correct}`;
  document.getElementById('wrong-badge').innerHTML = `❌ <span class="desktop-only">Wrong: </span>${wrong}`;

  document.getElementById('showing-badge').textContent = filteredCount === 0
    ? `0 of ${total}`
    : `${startIdx + 1}–${endIdx} of ${filteredCount}`;

  const sbResetBtn = document.getElementById('reset-progress-btn');
  if (sbResetBtn) {
    sbResetBtn.textContent = answered > 0 ? `↺ Reset (${answered})` : '↺ Reset';
  }

  const practiceResetBtn = document.getElementById('practice-reset-btn');
  if (practiceResetBtn) {
    practiceResetBtn.style.display = currentMode === 'practice' ? 'inline-flex' : 'none';
    practiceResetBtn.textContent = answered > 0 ? `↺ Reset Quiz (${answered})` : '↺ Reset Quiz';
  }

  const hasFilters = currentTopic !== 'all' || currentDifficulty !== 'all' || searchQuery.trim() !== '';
  document.getElementById('clear-filters-btn').style.display = hasFilters ? 'inline-block' : 'none';

  document.getElementById('sb-answered-label').textContent = `Completed: ${answered} / ${total}`;
  document.getElementById('sb-acc-label').textContent = answered > 0 ? `${Math.round((correct / answered) * 100)}%` : '0%';
  document.getElementById('sb-progress-fill').style.width = `${pct}%`;
  document.getElementById('sb-ok-text').textContent = `✅ ${correct} Correct`;
  document.getElementById('sb-bad-text').textContent = `❌ ${wrong} Wrong`;

  const totalPages = Math.max(1, Math.ceil(filteredCount / perPage));
  const jumpSelect = document.getElementById('jump-select');
  jumpSelect.innerHTML = '';
  for (let p = 1; p <= totalPages; p++) {
    const s = (p - 1) * perPage + 1;
    const e = Math.min(filteredCount, p * perPage);
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = filteredCount === 0 ? 'Page 1' : `Q${s}–Q${e}`;
    if (p === currentPage) opt.selected = true;
    jumpSelect.appendChild(opt);
  }
}

function renderCardTopRow(item, indexLabel, extraDoneBtnHtml) {
  const isSaved = Boolean(state.bookmarked[item.num]);
  const d = DIFFICULTY_MAP[item.num] || 'medium';
  const t = TOPIC_MAP[item.num];
  const diffLabel = d.charAt(0).toUpperCase() + d.slice(1);
  const topicText = TOPIC_FULL[t]
    ? `<span class="desktop-only">${escapeHtml(TOPIC_FULL[t])} • </span><span class="mobile-only">${escapeHtml(TOPIC_SHORT[t])} • </span>`
    : '';

  return `
    <div class="mcq-top-row">
      <div class="card-meta-left">
        <span class="q-badge">
          <span class="desktop-only">${indexLabel}</span>
          <span class="mobile-only">#${item.num}</span>
        </span>
        <span class="meta-inline">
          ${topicText}<span class="diff-dot-${d}">${diffLabel}</span>
        </span>
      </div>
      <div class="card-right-btns">
        ${extraDoneBtnHtml}
        <button class="bookmark-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleBookmark(${item.num})">
          ${isSaved ? '★ Saved' : '☆ Save'}
        </button>
      </div>
    </div>
  `;
}

function startMockExam() {
  const countSel = document.getElementById('mock-count-select');
  const diffSel = document.getElementById('mock-diff-select');
  const fbSel = document.getElementById('mock-fb-select');

  if (countSel) mockState.count = parseInt(countSel.value, 10);
  if (diffSel) mockState.difficulty = diffSel.value;
  if (fbSel) mockState.feedbackMode = fbSel.value;

  const pool = mockState.difficulty === 'all'
    ? MCQS_LIST
    : MCQS_LIST.filter(item => DIFFICULTY_MAP[item.num] === mockState.difficulty);

  const shuffled = shuffleArray(pool);
  mockState.questions = shuffled.slice(0, Math.min(mockState.count, shuffled.length));
  mockState.answers = {};
  mockState.submitted = false;
  mockState.active = true;
  activeCardIndex = 0;

  render();
  programmaticScrollUntil = Date.now() + 700;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function submitMockExam() {
  mockState.submitted = true;
  let newlyMissed = 0;
  for (const q of mockState.questions) {
    const picked = mockState.answers[q.num];
    if (picked && picked !== q.ans) {
      state.missed[q.num] = picked;
      newlyMissed++;
    }
  }
  if (newlyMissed > 0) saveState();
  render();
  programmaticScrollUntil = Date.now() + 700;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitMockExam() {
  mockState.active = false;
  mockState.submitted = false;
  render();
}

function renderMockView() {
  const mockArea = document.getElementById('mock-area');
  const container = document.getElementById('mcq-list');
  const nextBtn = document.getElementById('floating-next-btn');
  if (nextBtn) nextBtn.style.display = mockState.active ? 'inline-flex' : 'none';
  updateStats(0, 0, 0);

  if (!mockState.active) {
    container.style.display = 'none';
    mockArea.innerHTML = `
      <div class="mock-panel">
        <h2>🎲 Practice Mock Exam</h2>
        <p style="margin:0 0 14px; color:var(--muted); font-size:0.9rem;">Generate a randomized exam from the ${MCQS_LIST.length} questions in ${escapeHtml(EXAM_META.title)}.</p>
        <div class="mock-grid">
          <div class="mock-field">
            <label for="mock-count-select">Question Count</label>
            <select id="mock-count-select">
              <option value="10" ${mockState.count === 10 ? 'selected' : ''}>10 Questions (Quick Drill)</option>
              <option value="25" ${mockState.count === 25 ? 'selected' : ''}>25 Questions (Standard Quiz)</option>
              <option value="50" ${mockState.count === 50 ? 'selected' : ''}>50 Questions (Midterm Simulation)</option>
              <option value="100" ${mockState.count === 100 ? 'selected' : ''}>100 Questions (Marathon Test)</option>
            </select>
          </div>
          <div class="mock-field">
            <label for="mock-diff-select">Difficulty</label>
            <select id="mock-diff-select">
              <option value="all" ${mockState.difficulty === 'all' ? 'selected' : ''}>All Levels (${DIFF_COUNTS.all})</option>
              <option value="easy" ${mockState.difficulty === 'easy' ? 'selected' : ''}>Easy (${DIFF_COUNTS.easy})</option>
              <option value="medium" ${mockState.difficulty === 'medium' ? 'selected' : ''}>Medium (${DIFF_COUNTS.medium})</option>
              <option value="hard" ${mockState.difficulty === 'hard' ? 'selected' : ''}>Hard (${DIFF_COUNTS.hard})</option>
            </select>
          </div>
          <div class="mock-field">
            <label for="mock-fb-select">Feedback Timing</label>
            <select id="mock-fb-select">
              <option value="instant" ${mockState.feedbackMode === 'instant' ? 'selected' : ''}>Instant Feedback (Check after each answer)</option>
              <option value="exam" ${mockState.feedbackMode === 'exam' ? 'selected' : ''}>Exam Mode (Grade all at submission)</option>
            </select>
          </div>
        </div>
        <button class="primary-btn" onclick="startMockExam()">Start Mock Exam</button>
      </div>
    `;
    return;
  }

  container.style.display = 'block';
  const totalQ = mockState.questions.length;
  let answeredCount = 0;
  let correctCount = 0;
  let wrongCount = 0;

  for (const q of mockState.questions) {
    const picked = mockState.answers[q.num];
    if (picked) {
      answeredCount++;
      if (picked === q.ans) correctCount++;
      else wrongCount++;
    }
  }

  const diffLabel = mockState.difficulty.charAt(0).toUpperCase() + mockState.difficulty.slice(1);
  const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

  let topHtml = `
    <div class="mock-header-bar">
      <div class="stats-pills">
        <span class="stat-badge">🎲 ${totalQ} Qs (${diffLabel})</span>
        <span class="stat-badge amber">${answeredCount} / ${totalQ}</span>
        ${(mockState.feedbackMode === 'instant' || mockState.submitted) ? `
          <span class="stat-badge green">✅ ${correctCount}</span>
          <span class="stat-badge red">❌ ${wrongCount}</span>
        ` : ''}
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:7px;">
        ${!mockState.submitted ? `<button class="primary-btn" style="padding:7px 14px; font-size:0.82rem;" onclick="submitMockExam()">Submit &amp; Grade</button>` : ''}
        <button class="action-btn" onclick="startMockExam()">New Set</button>
        <button class="action-btn" onclick="exitMockExam()">Settings</button>
      </div>
    </div>
  `;

  if (mockState.submitted) {
    const unanswered = totalQ - answeredCount;
    topHtml += `
      <div class="mock-score-box">
        <div>
          <div class="mock-score-main">Score: ${correctCount} / ${totalQ} (${pct}%)</div>
          <div style="font-size:0.86rem; color:var(--muted); margin-top:3px;">
            ✅ Correct: <strong>${correctCount}</strong> &nbsp;•&nbsp;
            ❌ Wrong: <strong>${wrongCount}</strong> &nbsp;•&nbsp;
            ⚪ Unanswered: <strong>${unanswered}</strong>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${wrongCount > 0 ? `<button class="action-btn danger" onclick="setMode('missed')">Review Missed (${Object.keys(state.missed).length})</button>` : ''}
          <button class="primary-btn" onclick="startMockExam()">Try Another Set</button>
        </div>
      </div>
    `;
  }

  mockArea.innerHTML = topHtml;

  let html = '';
  const letters = ['A', 'B', 'C', 'D'];

  for (let i = 0; i < totalQ; i++) {
    const item = mockState.questions[i];
    const picked = mockState.answers[item.num];
    const isLocked = Boolean(picked) || mockState.submitted;
    const showResult = mockState.submitted || (mockState.feedbackMode === 'instant' && Boolean(picked));

    let optionsHtml = '';
    for (const L of letters) {
      let cls = 'mcq-option';
      let badge = '';
      if (isLocked) cls += ' locked';

      if (showResult) {
        if (L === item.ans) { cls += ' correct'; badge = '<span>✅</span>'; }
        else if (picked === L && L !== item.ans) { cls += ' wrong'; badge = '<span>❌</span>'; }
        else { cls += ' locked-dim'; }
      } else if (picked) {
        if (picked === L) { cls += ' selected-pending'; badge = '<span>●</span>'; }
        else { cls += ' locked-dim'; }
      }

      optionsHtml += `
        <div class="${cls}" onclick="selectOption(${item.num}, '${L}')">
          <span>${L}. ${escapeHtml(item[L])}</span>
          ${badge}
        </div>
      `;
    }

    let bannerContent = 'Choose an option above';
    if (showResult) {
      bannerContent = `<div style="width:100%;"><strong>ANSWER: ${item.ans}</strong>${renderExplanationHtml(item)}</div>`;
    } else if (picked) {
      bannerContent = `Selected: <strong>${picked}</strong>`;
    }

    html += `
      <div class="mcq-card" id="card-idx-${i}" data-num="${item.num}" onclick="setActiveCard(${i})">
        ${renderCardTopRow(item, `Mock ${i + 1} of ${totalQ} • Bank #${item.num}`, '')}
        <p class="mcq-question">${i + 1}. ${escapeHtml(item.q)}</p>
        ${optionsHtml}
        <div class="mcq-answer-banner">${bannerContent}</div>
      </div>
    `;
  }

  container.innerHTML = html;
  highlightActiveCard();
}

function render() {
  const nextBtn = document.getElementById('floating-next-btn');

  if (MCQS_LIST.length === 0) {
    if (nextBtn) nextBtn.style.display = 'none';
    document.getElementById('mcq-list').innerHTML = `
      <div class="empty-state">
        <h3>No Questions Loaded</h3>
        <p>Check that the subject's data file exists in <code>data/</code> or click <strong>📤 Upload</strong> to load a <code>.json</code> or <code>.js</code> file.</p>
      </div>
    `;
    return;
  }

  if (currentMode === 'mock') {
    renderMockView();
    return;
  }

  const container = document.getElementById('mcq-list');
  container.style.display = 'block';

  const filtered = getFilteredList();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * perPage;
  const endIdx = Math.min(filtered.length, startIdx + perPage);
  const pageItems = filtered.slice(startIdx, endIdx);

  if (nextBtn) nextBtn.style.display = pageItems.length > 0 ? 'inline-flex' : 'none';

  updateStats(filtered.length, startIdx, endIdx);

  const reviewHeaderArea = document.getElementById('review-header-area');
  if (currentMode === 'missed') {
    const totalMissed = Object.keys(state.missed).length;
    reviewHeaderArea.innerHTML = totalMissed > 0 ? `
      <div class="review-control-panel missed-theme">
        <div>
          <h3>Missed Questions (${totalMissed})</h3>
          <p>${missedRetryMode
            ? 'Answer each question correctly to clear it automatically.'
            : 'Review your mistakes, mark mastered items done, or retry them.'}</p>
        </div>
        <div class="review-actions">
          <button class="primary-btn" style="padding:7px 14px; font-size:0.82rem;" onclick="toggleMissedRetry()">
            ${missedRetryMode ? '📖 Back to Review' : '🔄 Retry Missed'}
          </button>
          <button class="action-btn danger" onclick="clearAllMissed()">🧹 Clear All</button>
        </div>
      </div>
    ` : '';
  } else if (currentMode === 'bookmarked') {
    const totalSaved = Object.keys(state.bookmarked).length;
    reviewHeaderArea.innerHTML = totalSaved > 0 ? `
      <div class="review-control-panel saved-theme">
        <div>
          <h3>Saved Questions (${totalSaved})</h3>
          <p>${savedPracticeMode
            ? 'Quiz yourself on your saved questions — mark done once mastered.'
            : 'Review your bookmarked questions, practice them, or clear the list.'}</p>
        </div>
        <div class="review-actions">
          <button class="primary-btn" style="padding:7px 14px; font-size:0.82rem;" onclick="toggleSavedPractice()">
            ${savedPracticeMode ? '📖 Study Saved' : '✍️ Practice Saved'}
          </button>
          <button class="action-btn danger" onclick="clearAllSaved()">🧹 Clear All</button>
        </div>
      </div>
    ` : '';
  }

  if (pageItems.length === 0) {
    let emptyTitle = 'No matching questions found';
    let emptyDesc = 'Try clearing your active topic, difficulty, or search filters.';
    if (currentMode === 'missed') {
      emptyTitle = 'No missed questions to review';
      emptyDesc = 'Your missed list is completely clear.';
    } else if (currentMode === 'bookmarked') {
      emptyTitle = 'No saved questions yet';
      emptyDesc = 'Tap ☆ Save on any question to collect it here for quick revision.';
    }
    container.innerHTML = `<div class="empty-state"><h3>${emptyTitle}</h3><p>${emptyDesc}</p></div>`;
    return;
  }

  let html = '';

  for (let i = 0; i < pageItems.length; i++) {
    const item = pageItems[i];
    const opts = getDisplayedOptions(item);

    let picked = null;
    let isLocked = false;
    let isRevealed = false;

    if (currentMode === 'study') {
      isRevealed = true;
    } else if (currentMode === 'missed') {
      if (missedRetryMode) {
        picked = missedRetryAnswers[item.num];
        isLocked = Boolean(picked);
        isRevealed = Boolean(picked);
      } else {
        picked = state.missed[item.num];
        isLocked = true;
        isRevealed = true;
      }
    } else if (currentMode === 'bookmarked') {
      if (savedPracticeMode) {
        picked = savedPracticeAnswers[item.num];
        isLocked = Boolean(picked);
        isRevealed = Boolean(picked);
      } else {
        isRevealed = true;
      }
    } else {
      picked = state.selected[item.num];
      isLocked = Boolean(picked) || Boolean(state.revealed[item.num]);
      isRevealed = isLocked;
    }

    let optionsHtml = '';
    for (const opt of opts) {
      let cls = 'mcq-option';
      let badge = '';
      if (isLocked) cls += ' locked';

      if (isRevealed) {
        if (opt.origLetter === item.ans) { cls += ' correct'; badge = '<span>✅</span>'; }
        else if (picked === opt.origLetter && opt.origLetter !== item.ans) { cls += ' wrong'; badge = '<span>❌</span>'; }
        else if (isLocked) { cls += ' locked-dim'; }
      }

      optionsHtml += `
        <div class="${cls}" onclick="selectOption(${item.num}, '${opt.origLetter}')">
          <span>${opt.displayLetter}. ${escapeHtml(opt.text)}</span>
          ${badge}
        </div>
      `;
    }

    const correctOpt = opts.find(o => o.origLetter === item.ans);
    const ansLabel = shuffleOptionsEnabled
      ? `<strong>ANSWER: ${correctOpt.displayLetter}</strong> (Key: ${item.ans})`
      : `<strong>ANSWER: ${item.ans}</strong>`;
    const keyTakeaway = renderExplanationHtml(item);

    let footerBanner = '';
    if (currentMode === 'study') {
      footerBanner = `<div class="mcq-answer-banner"><div style="width:100%;">${ansLabel}${keyTakeaway}</div></div>`;
    } else if (currentMode === 'missed' && !missedRetryMode) {
      const wrongOpt = opts.find(o => o.origLetter === picked);
      const wrongLabel = wrongOpt ? wrongOpt.displayLetter : picked;
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">Your choice: <strong>${wrongLabel}</strong> • ${ansLabel}${keyTakeaway}</div>
          <button class="done-pill-btn" onclick="clearMissedSingle(${item.num})">✓ Done</button>
        </div>
      `;
    } else if (currentMode === 'missed' && missedRetryMode) {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="width:100%;">
            ${isRevealed
              ? `${picked === item.ans ? '🎉 Correct — removed from Missed' : 'Still incorrect'} • ${ansLabel}${keyTakeaway}`
              : 'Select an option above to test yourself'}
          </div>
        </div>
      `;
    } else if (currentMode === 'bookmarked' && !savedPracticeMode) {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">${ansLabel}${keyTakeaway}</div>
          <button class="done-pill-btn" onclick="clearSavedSingle(${item.num})">✓ Done</button>
        </div>
      `;
    } else if (currentMode === 'bookmarked' && savedPracticeMode) {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">${isRevealed ? `${ansLabel}${keyTakeaway}` : 'Select an option above to test yourself'}</div>
          ${isRevealed ? `<button class="done-pill-btn" onclick="clearSavedSingle(${item.num})">✓ Done</button>` : ''}
        </div>
      `;
    } else {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">${isRevealed ? `${ansLabel}${keyTakeaway}` : 'Select an option above'}</div>
          ${!isLocked ? `<button class="reveal-single-btn" onclick="toggleRevealSingle(${item.num})">Show Answer</button>` : ''}
        </div>
      `;
    }

    let extraDoneBtn = '';
    if (currentMode === 'missed') {
      extraDoneBtn = `<button class="done-pill-btn" onclick="event.stopPropagation(); clearMissedSingle(${item.num})">✓ Done</button>`;
    } else if (currentMode === 'bookmarked') {
      extraDoneBtn = `<button class="done-pill-btn" onclick="event.stopPropagation(); clearSavedSingle(${item.num})">✓ Done</button>`;
    }

    html += `
      <div class="mcq-card" id="card-idx-${i}" data-num="${item.num}" onclick="setActiveCard(${i})">
        ${renderCardTopRow(item, `Question ${item.num} of ${MCQS_LIST.length}`, extraDoneBtn)}
        <p class="mcq-question">${item.num}. ${escapeHtml(item.q)}</p>
        ${optionsHtml}
        ${footerBanner}
      </div>
    `;
  }

  if (totalPages > 1) {
    html += `
      <div class="pagination-bar">
        <button class="page-btn" onclick="jumpToBatch(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span style="font-size:0.86rem; font-weight:700; color:var(--muted);">Page ${currentPage} of ${totalPages}</span>
        <button class="page-btn" onclick="jumpToBatch(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
      </div>
    `;
  }

  container.innerHTML = html;
  highlightActiveCard();
}

/* --------------------------------------------------------------------------
   9. Navigation Helpers, Keyboard Shortcuts & Bootstrap
   -------------------------------------------------------------------------- */
function setActiveCard(idx) {
  activeCardIndex = idx;
  highlightActiveCard();
}

function highlightActiveCard() {
  const cards = document.querySelectorAll('#mcq-list .mcq-card');
  if (!cards.length) return;
  if (activeCardIndex >= cards.length) activeCardIndex = cards.length - 1;
  if (activeCardIndex < 0) activeCardIndex = 0;
  cards.forEach((c, idx) => c.classList.toggle('active-card', idx === activeCardIndex));
}

function goToNextQuestion() {
  const cards = document.querySelectorAll('#mcq-list .mcq-card');
  if (!cards.length) return;

  if (activeCardIndex < cards.length - 1) {
    activeCardIndex++;
    highlightActiveCard();
    programmaticScrollUntil = Date.now() + 700;
    cards[activeCardIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // At the end of current page: advance to next batch if available
  if (currentMode !== 'mock') {
    const filtered = getFilteredList();
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage < totalPages) {
      jumpToBatch(currentPage + 1);
    }
  }
}

function scrollToTop() {
  activeCardIndex = 0;
  highlightActiveCard();
  programmaticScrollUntil = Date.now() + 700;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Keep activeCardIndex synced gently when scrolling manually on mobile/desktop
let scrollSyncTimer = null;
window.addEventListener('scroll', () => {
  if (Date.now() < programmaticScrollUntil) return;
  if (scrollSyncTimer) clearTimeout(scrollSyncTimer);
  scrollSyncTimer = setTimeout(() => {
    const cards = document.querySelectorAll('#mcq-list .mcq-card');
    if (!cards.length) return;
    const viewportMid = window.innerHeight * 0.42;
    let bestIdx = activeCardIndex;
    let bestDist = Infinity;
    cards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const cardCenter = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(cardCenter - viewportMid);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      }
    });
    if (bestIdx !== activeCardIndex) {
      activeCardIndex = bestIdx;
      highlightActiveCard();
    }
  }, 110);
}, { passive: true });

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const tag = document.activeElement ? document.activeElement.tagName : '';
  const kbdModalOpen = document.getElementById('kbd-modal').classList.contains('open');
  const uploadModalOpen = document.getElementById('upload-modal').classList.contains('open');

  if (e.key === 'Escape') {
    if (kbdModalOpen || uploadModalOpen) closeModals();
    else closeMobileSidebar();
    return;
  }

  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  if (kbdModalOpen) {
    e.preventDefault();
    highlightModalKey(e.key);
    if (e.key === '?') closeModals();
    return;
  }

  if (uploadModalOpen) return;

  if (e.key === '?') {
    e.preventDefault();
    openKbdModal();
    return;
  }

  if (e.key === '[') { e.preventDefault(); toggleSidebar(); return; }
  if (e.key === 't' || e.key === 'T') { e.preventDefault(); scrollToTop(); return; }
  if (e.key === '/') {
    e.preventDefault();
    if (window.innerWidth <= 920) document.body.classList.add('mobile-sidebar-open');
    else document.body.classList.remove('sidebar-collapsed');
    const sb = document.getElementById('search-box');
    if (sb) sb.focus();
    return;
  }

  const cards = document.querySelectorAll('#mcq-list .mcq-card');
  if (!cards.length) return;

  if (e.key === 'n' || e.key === 'N' || e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
    e.preventDefault();
    goToNextQuestion();
  } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
    e.preventDefault();
    activeCardIndex = Math.max(0, activeCardIndex - 1);
    highlightActiveCard();
    programmaticScrollUntil = Date.now() + 700;
    cards[activeCardIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key)) {
    const activeCard = cards[activeCardIndex];
    if (!activeCard) return;
    const map = { '1': 0, 'a': 0, 'A': 0, '2': 1, 'b': 1, 'B': 1, '3': 2, 'c': 2, 'C': 2, '4': 3, 'd': 3, 'D': 3 };
    const optEls = activeCard.querySelectorAll('.mcq-option');
    if (optEls[map[e.key]]) optEls[map[e.key]].click();
  } else if (e.key === 's' || e.key === 'S') {
    const activeCard = cards[activeCardIndex];
    if (activeCard) toggleBookmark(parseInt(activeCard.dataset.num, 10));
  } else if (e.key === 'e' || e.key === 'E') {
    const activeCard = cards[activeCardIndex];
    if (activeCard && currentMode === 'practice') toggleRevealSingle(parseInt(activeCard.dataset.num, 10));
  }
});

(async function bootstrapQuizEngine() {
  switchSampleTab('json');

  const subjectId = getRequestedSubjectId();
  const registryEntry = findSubjectEntry(subjectId);
  const candidatePaths = resolveCandidatePaths(subjectId, registryEntry);

  let loaded = false;
  for (const path of candidatePaths) {
    try {
      await loadScriptOnce(path);
      loaded = true;
      break;
    } catch (e) {}
  }

  const dataset = extractLoadedDataset(subjectId, registryEntry);
  if (!loaded && dataset.mcqs.length === 0) {
    document.getElementById('hero-code').textContent = subjectId.toUpperCase();
    document.getElementById('hero-title').textContent = (registryEntry && (registryEntry.title || registryEntry.name)) || `Subject: ${subjectId}`;
    document.getElementById('hero-sub').textContent = `Tried loading: ${candidatePaths.join(', ')}`;
  }

  initializeDataset(dataset);
})();