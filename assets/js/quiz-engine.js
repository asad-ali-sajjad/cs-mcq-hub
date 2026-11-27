/* ==========================================================================
   ReviseLoop — Universal Quiz & Review Engine
   Supports dynamic subject loading via ?subject=<id>, validated local upload,
   sample template downloads, progress export/import, and keyboard shortcuts.
   ========================================================================== */

const CFG = window.SITE_CONFIG || {};
const quizDefaults = CFG.quizDefaults || {};
const storageConfig = CFG.storage || {};
const brandConfig = CFG.brand || {};
const linksConfig = CFG.links || {};
const fallbackSubjectId = quizDefaults.fallbackSubjectId || 'pdc';
const fallbackCourseCode = quizDefaults.fallbackCourseCode || 'BANK';
const fallbackTitle = quizDefaults.fallbackTitle || 'Subject Practice';
const fallbackSubtitle = quizDefaults.fallbackSubtitle || 'Interactive MCQ Practice & Exam Review';
const defaultPerPage = quizDefaults.defaultPerPage || 50;
const perPageOptions = Array.isArray(quizDefaults.perPageOptions) ? quizDefaults.perPageOptions : [50, 100, 9999];
const defaultMockCount = quizDefaults.defaultMockCount || 25;
const mockCountOptions = Array.isArray(quizDefaults.mockCountOptions) ? quizDefaults.mockCountOptions : [10, 25, 50, 100];
const undoToastDurationMs = quizDefaults.undoToastDurationMs || 6000;
const maxUploadSizeMB = quizDefaults.maxUploadSizeMB || 10;

let ACTIVE_SUBJECT_ID = fallbackSubjectId;
let EXAM_META = {
  id: fallbackSubjectId,
  courseCode: fallbackCourseCode,
  title: fallbackTitle,
  subtitle: fallbackSubtitle
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
let perPage = defaultPerPage;

let missedRetryMode = false;
let missedRetryAnswers = {};
let savedPracticeMode = false;
let savedPracticeAnswers = {};

let undoBackup = null;
let undoTimer = null;
let activeSampleTab = 'json';
let programmaticScrollUntil = 0;
let lastFocusedBeforeModal = null;

let state = { selected: {}, revealed: {}, missed: {}, bookmarked: {}, stats: null, updatedAt: 0 };

let mockState = {
  active: false,
  count: defaultMockCount,
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
  courseCode: "CS-305",
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
  return (params.get('subject') || params.get('id') || params.get('exam') || fallbackSubjectId).trim();
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

  const title = (rawObj && rawObj.title) || (registryEntry && (registryEntry.title || registryEntry.name)) || fallbackTitle;
  const courseCode = (rawObj && (rawObj.courseCode || rawObj.code)) || (registryEntry && (registryEntry.courseCode || registryEntry.code)) || fallbackCourseCode;
  const subtitle = (rawObj && rawObj.subtitle) || (registryEntry && (registryEntry.subtitle || registryEntry.description)) || fallbackSubtitle;
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
  const parsedNum = item.num != null ? Number(item.num) : NaN;
  const parsedWeek = item.week != null ? Number(item.week) : NaN;
  return {
    num: Number.isFinite(parsedNum) ? parsedNum : index + 1,
    week: Number.isFinite(parsedWeek) ? parsedWeek : null,
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

function computeDifficultyScore(item) {
  const qRaw = item.q.trim();
  const qLower = qRaw.toLowerCase();
  const options = [item.A, item.B, item.C, item.D];
  const avgOptLen = options.reduce((sum, opt) => sum + opt.length, 0) / 4;

  let score = 0;

  // 1. Quantitative / calculation / problem-solving cues (Strong Hard signals)
  if (/\b(calculate|compute|derive|evaluate|solve|estimate|how many|how much|what is the (value|number|total|minimum|maximum|average|expected|resulting|final|effective|net|overall|exact)|by what factor|by how much|to (two|three|four) decimal places|what will be the output|trace)\b/i.test(qLower)) {
    score += 4.5;
  }

  if (/\b(suppose|assume|consider a|given a|if a system|if a network|if a model|if there are|for a system with|with \d+)\b/i.test(qLower)) {
    score += 3.0;
  }

  if (/\b(\d+\.\d+|\d+e[+-]?\d+|\d+\s*[x×*]\s*\d+|O\([^)]+\)|\d+\s*(%|ms|us|ns|s|sec|min|kb|mb|gb|tb|bytes|bits|hz|khz|mhz|ghz|kbps|mbps|gbps|cores|threads|nodes|layers|epochs))\b/i.test(qRaw)) {
    score += 3.0;
  }

  const numericOptionsCount = options.filter(opt => /(\b\d+(\.\d+)?\b|O\([^)]+\)|\d+\s*%)/.test(opt)).length;
  if (numericOptionsCount >= 3) {
    score += 3.5;
  } else if (numericOptionsCount >= 1) {
    score += 1.0;
  }

  // 2. Analytical / negation / multi-condition cues (Medium-to-Hard signals)
  if (/\b(NOT|EXCEPT|NEVER|FALSE|INCORRECT|LEAST)\b/.test(qRaw) || /\b(cannot|does not|do not|is not|are not|neither|nor)\b/i.test(qLower)) {
    score += 2.5;
  }

  if (/\b(why does|why is|why would|what happens (if|when)|how does .* differ|difference between|compared to|in contrast to|unlike|whereas|trade-?off|advantage of .* over|limitation of|bottleneck|overhead|failure|degrade)\b/i.test(qLower)) {
    score += 2.0;
  }

  if (/\b(when|while|although|though|however|unless|provided that|whenever|during)\b/i.test(qLower)) {
    score += 1.2;
  }

  // 3. Direct recall / definition cues (Easy signals)
  if (/^(what is|what are|what does|what do|define|which term|which concept|which protocol|which layer|which algorithm|which technique|which component|which function|which method|which type|which mode|which of the following (is|are|best defines|refers to|represents|describes))\b/i.test(qLower)) {
    score -= 2.2;
  }

  if (/\b(stands for|refers to|is defined as|is known as|is called|primary purpose|main purpose|main goal|main function|basic unit|full form)\b/i.test(qLower)) {
    score -= 2.2;
  }

  // 4. Continuous structural length & multi-sentence gradient
  const stemLenScore = Math.max(-1.5, Math.min(4.0, (qRaw.length - 85) / 35));
  const optLenScore = Math.max(-1.0, Math.min(3.0, (avgOptLen - 35) / 25));
  score += stemLenScore + optLenScore;

  if (/[.?]\s+[A-Z]/.test(qRaw)) {
    score += 1.8;
  }

  return Number(score.toFixed(3));
}

function classifyBankDifficulties(items) {
  const result = {};
  const untagged = [];

  for (const item of items) {
    if (['easy', 'medium', 'hard'].includes(item.difficulty)) {
      result[item.num] = item.difficulty;
    } else {
      untagged.push({ num: item.num, score: computeDifficultyScore(item) });
    }
  }

  if (untagged.length === 0) return result;

  if (untagged.length < 6) {
    for (const u of untagged) {
      result[u.num] = u.score <= 0.5 ? 'easy' : (u.score >= 4.2 ? 'hard' : 'medium');
    }
    return result;
  }

  const sorted = untagged.slice().sort((a, b) => (a.score - b.score) || (a.num - b.num));
  const easyCutoffRaw = sorted[Math.floor(sorted.length * 0.30)].score;
  const hardCutoffRaw = sorted[Math.floor(sorted.length * 0.75)].score;

  const easyThreshold = Math.max(-1.0, Math.min(2.2, easyCutoffRaw));
  const hardThreshold = Math.max(easyThreshold + 1.4, Math.min(6.5, hardCutoffRaw));

  for (const u of untagged) {
    if (u.score <= easyThreshold) result[u.num] = 'easy';
    else if (u.score >= hardThreshold) result[u.num] = 'hard';
    else result[u.num] = 'medium';
  }

  return result;
}

function initializeDataset(dataset, options) {
  const opts = options || {};
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

  const classifiedDifficulties = classifyBankDifficulties(MCQS_LIST);

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

    const d = classifiedDifficulties[item.num] || 'medium';
    DIFFICULTY_MAP[item.num] = d;
    DIFF_COUNTS[d]++;
  }

  loadSubjectProgress();
  if (!opts.skipPersist && MCQS_LIST.length > 0) {
    saveState();
  }
  applyHeaderAndTopicUI();
  render();
}

function applyHeaderAndTopicUI() {
  const total = MCQS_LIST.length;
  document.title = `${EXAM_META.title} (${total} MCQs) — ${brandConfig.name || 'ReviseLoop'}`;
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
    let chipsHtml = `<button type="button" class="topic-chip active" data-topic="all" onclick="setTopic('all')">All Topics (${total})</button>`;
    for (const t of TOPICS_CONFIG) {
      chipsHtml += `<button type="button" class="topic-chip" data-topic="${escapeHtml(t.id)}" onclick="setTopic('${escapeHtml(t.id)}')">${escapeHtml(t.label)}</button>`;
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
  lastFocusedBeforeModal = document.activeElement;
  closeModals(true);
  closeMobileSidebar();
  switchSampleTab(activeSampleTab);
  const fb = document.getElementById('upload-feedback');
  if (fb) { fb.style.display = 'none'; fb.textContent = ''; }
  const modal = document.getElementById('upload-modal');
  modal.removeAttribute('inert');
  modal.classList.add('open');
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) closeBtn.focus();
}

function openKbdModal() {
  lastFocusedBeforeModal = document.activeElement;
  closeModals(true);
  closeMobileSidebar();
  const modal = document.getElementById('kbd-modal');
  modal.removeAttribute('inert');
  modal.classList.add('open');
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) closeBtn.focus();
}

function closeModals(skipFocusRestore) {
  document.querySelectorAll('.hub-modal-backdrop').forEach(el => {
    el.classList.remove('open');
    el.setAttribute('inert', '');
  });
  if (!skipFocusRestore && lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus();
    lastFocusedBeforeModal = null;
  }
}

function switchSampleTab(type) {
  activeSampleTab = type;
  document.getElementById('sample-tab-json').classList.toggle('active', type === 'json');
  document.getElementById('sample-tab-js').classList.toggle('active', type === 'js');
  document.getElementById('sample-code-block').textContent = type === 'json' ? SAMPLE_JSON_TEXT : SAMPLE_JS_TEXT;
}

function copySampleCode() {
  const text = activeSampleTab === 'json' ? SAMPLE_JSON_TEXT : SAMPLE_JS_TEXT;
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-sample-btn');
    btn.textContent = '✅ Copied';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1600);
  }).catch(() => {});
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
  if (file.size > maxUploadSizeMB * 1024 * 1024) {
    showUploadFeedback('error', `File exceeds the ${maxUploadSizeMB} MB size limit.`);
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

      initializeDataset(datasetObj, { skipPersist: true });
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
    syncSidebarAccessibility();
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
    const opt = updatedCards[activeCardIndex] && updatedCards[activeCardIndex].querySelector('.mcq-option:not(:disabled)');
    if (opt) opt.click();
  }
}

/* --------------------------------------------------------------------------
   4. Per-Subject LocalStorage Persistence, Migration & Export/Import
   -------------------------------------------------------------------------- */
function getStorageKey() {
  const prefix = storageConfig.prefix || 'reviseloop_';
  const version = storageConfig.version || 'v1';
  return `${prefix}${ACTIVE_SUBJECT_ID}_${version}`;
}

function getLegacyStorageKey() {
  const prefix = storageConfig.prefix || 'reviseloop_';
  return `${prefix}${ACTIVE_SUBJECT_ID}`;
}

function computeCurrentStats() {
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
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
  return { total, answered, correct, wrong, accuracy };
}

function normalizeProgressObject(rawObj) {
  const safe = { selected: {}, revealed: {}, missed: {}, bookmarked: {}, stats: null, updatedAt: 0 };
  if (!rawObj || typeof rawObj !== 'object') return safe;
  if (rawObj.selected && typeof rawObj.selected === 'object' && !Array.isArray(rawObj.selected)) {
    safe.selected = Object.assign({}, rawObj.selected);
  }
  if (rawObj.revealed && typeof rawObj.revealed === 'object' && !Array.isArray(rawObj.revealed)) {
    safe.revealed = Object.assign({}, rawObj.revealed);
  }
  if (rawObj.missed && typeof rawObj.missed === 'object' && !Array.isArray(rawObj.missed)) {
    safe.missed = Object.assign({}, rawObj.missed);
  }
  if (rawObj.bookmarked && typeof rawObj.bookmarked === 'object' && !Array.isArray(rawObj.bookmarked)) {
    safe.bookmarked = Object.assign({}, rawObj.bookmarked);
  }
  if (rawObj.stats && typeof rawObj.stats === 'object' && !Array.isArray(rawObj.stats)) {
    safe.stats = Object.assign({}, rawObj.stats);
  }
  if (typeof rawObj.updatedAt === 'number' && Number.isFinite(rawObj.updatedAt)) {
    safe.updatedAt = rawObj.updatedAt;
  }
  return safe;
}

function loadSubjectProgress() {
  state = normalizeProgressObject(null);
  try {
    const currentKey = getStorageKey();
    let raw = localStorage.getItem(currentKey);
    if (!raw) {
      const legacyRaw = localStorage.getItem(getLegacyStorageKey());
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(currentKey, legacyRaw);
      }
    }
    if (raw) {
      state = normalizeProgressObject(JSON.parse(raw));
    }
  } catch (e) {}
}

function saveState() {
  state.stats = computeCurrentStats();
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch (e) {}
}

function exportProgress() {
  const payload = {
    app: brandConfig.name || 'ReviseLoop',
    version: 1,
    subjectId: ACTIVE_SUBJECT_ID,
    subjectTitle: EXAM_META.title,
    exportedAt: new Date().toISOString(),
    state: Object.assign(normalizeProgressObject(state), { stats: computeCurrentStats() })
  };
  const dateStamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reviseloop-${ACTIVE_SUBJECT_ID}-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showUndoToast(`Exported progress for ${EXAM_META.title}.`, null, null);
}

function importProgressFile(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(String(e.target.result || ''));
      const incomingRaw = parsed && parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
      if (!incomingRaw || typeof incomingRaw !== 'object' || (!incomingRaw.selected && !incomingRaw.missed && !incomingRaw.bookmarked)) {
        showUndoToast('Invalid progress backup file.', null, null);
        return;
      }

      const snapshot = normalizeProgressObject(state);
      state = normalizeProgressObject(incomingRaw);
      saveState();
      render();

      const importedCount = Object.keys(state.selected).length;
      const subjectNote = parsed.subjectId && parsed.subjectId !== ACTIVE_SUBJECT_ID
        ? ` (from ${parsed.subjectId})`
        : '';
      showUndoToast(`Imported progress${subjectNote}: ${importedCount} answered.`, 'full', snapshot);
    } catch (err) {
      showUndoToast(`Could not read backup file: ${err.message}`, null, null);
    }
  };
  reader.readAsText(file);
}

/* --------------------------------------------------------------------------
   5. Sidebar, Toast & Helpers
   -------------------------------------------------------------------------- */
function syncSidebarAccessibility() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  const isMobile = window.innerWidth <= 920;
  const isHidden = isMobile
    ? !document.body.classList.contains('mobile-sidebar-open')
    : document.body.classList.contains('sidebar-collapsed');

  if (isHidden) {
    sidebar.setAttribute('inert', '');
    sidebar.setAttribute('aria-hidden', 'true');
  } else {
    sidebar.removeAttribute('inert');
    sidebar.removeAttribute('aria-hidden');
  }
}

function toggleSidebar() {
  if (window.innerWidth <= 920) {
    document.body.classList.toggle('mobile-sidebar-open');
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
  syncSidebarAccessibility();
}

function closeMobileSidebar() {
  document.body.classList.remove('mobile-sidebar-open');
  syncSidebarAccessibility();
}

window.addEventListener('resize', syncSidebarAccessibility, { passive: true });

function showUndoToast(message, type, snapshot) {
  if (undoTimer) clearTimeout(undoTimer);
  undoBackup = type && snapshot ? { type, snapshot } : null;
  const area = document.getElementById('undo-toast-area');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="undo-toast">
      <span>${escapeHtml(message)}</span>
      ${undoBackup ? '<button type="button" class="undo-btn" onclick="triggerUndo()">↺ Undo</button>' : ''}
    </div>
  `;
  undoTimer = setTimeout(() => {
    area.style.display = 'none';
    undoBackup = null;
  }, undoToastDurationMs);
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
  } else if (undoBackup.type === 'full') {
    state = normalizeProgressObject(undoBackup.snapshot);
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

function buildReportIssueUrl(item) {
  const baseUrl = (linksConfig.issuesUrl || 'https://github.com/asad-ali-sajjad/reviseloop/issues').replace(/\/+$/, '');
  const title = `[Question Issue] ${EXAM_META.title} — Q#${item.num}`;
  const body = [
    `**Subject:** ${EXAM_META.title} (\`${ACTIVE_SUBJECT_ID}\`)`,
    `**Question #:** ${item.num}`,
    '',
    `**Question:**`,
    item.q,
    '',
    `**Options:**`,
    `- A: ${item.A}`,
    `- B: ${item.B}`,
    `- C: ${item.C}`,
    `- D: ${item.D}`,
    '',
    `**Current Answer Key:** ${item.ans}`,
    '',
    `**What needs fixing?**`,
    '<!-- Describe the typo, wrong answer key, or unclear explanation -->'
  ].join('\n');

  return `${baseUrl}/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
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
  const order = perms[Math.abs(item.num) % perms.length];
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
  btn.setAttribute('aria-pressed', String(shuffleOptionsEnabled));
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
    if (el) {
      const isActive = m === mode;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-pressed', String(isActive));
    }
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
    const isActive = chip.dataset.topic === topic;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-pressed', String(isActive));
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
    if (el) {
      const isActive = d === diff;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-pressed', String(isActive));
    }
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

function configureQuizControls() {
  const perPageSelect = document.getElementById('per-page-select');
  if (perPageSelect) {
    perPageSelect.innerHTML = perPageOptions.map((count) => {
      const label = count >= 9999 ? 'Show All' : `${count} / page`;
      return `<option value="${count}"${count === defaultPerPage ? ' selected' : ''}>${label}</option>`;
    }).join('');
  }
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
    const isAll = chip.dataset.topic === 'all';
    chip.classList.toggle('active', isAll);
    chip.setAttribute('aria-pressed', String(isAll));
  });
  ['all', 'easy', 'medium', 'hard'].forEach(d => {
    const el = document.getElementById(`diff-${d}`);
    if (el) {
      const isAll = d === 'all';
      el.classList.toggle('active', isAll);
      el.setAttribute('aria-pressed', String(isAll));
    }
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
  const { total, answered, correct, wrong, accuracy } = computeCurrentStats();
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
  document.getElementById('sb-acc-label').textContent = accuracy != null ? `${accuracy}%` : '0%';
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
  const reportUrl = buildReportIssueUrl(item);

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
        <a class="report-link-btn" href="${reportUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Report an error in this question" aria-label="Report an error in question ${item.num}">
          ⚑ <span class="desktop-only">Report</span>
        </a>
        <button type="button" class="bookmark-btn ${isSaved ? 'saved' : ''}" aria-pressed="${isSaved}" onclick="event.stopPropagation(); toggleBookmark(${item.num})">
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
              ${mockCountOptions.map(count => `<option value="${count}"${mockState.count === count ? ' selected' : ''}>${count} Questions</option>`).join('')}
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
        <button type="button" class="primary-btn" onclick="startMockExam()">Start Mock Exam</button>
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
        ${!mockState.submitted ? `<button type="button" class="primary-btn" style="padding:7px 14px; font-size:0.82rem;" onclick="submitMockExam()">Submit &amp; Grade</button>` : ''}
        <button type="button" class="action-btn" onclick="startMockExam()">New Set</button>
        <button type="button" class="action-btn" onclick="exitMockExam()">Settings</button>
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
          ${wrongCount > 0 ? `<button type="button" class="action-btn danger" onclick="setMode('missed')">Review Missed (${Object.keys(state.missed).length})</button>` : ''}
          <button type="button" class="primary-btn" onclick="startMockExam()">Try Another Set</button>
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
        if (L === item.ans) {
          cls += ' correct';
          badge = '<span class="opt-status-icon" aria-label="Correct">✅</span>';
        } else if (picked === L && L !== item.ans) {
          cls += ' wrong';
          badge = '<span class="opt-status-icon" aria-label="Incorrect">❌</span>';
        } else {
          cls += ' locked-dim';
        }
      } else if (picked) {
        if (picked === L) {
          cls += ' selected-pending';
          badge = '<span class="opt-status-icon" aria-label="Selected">●</span>';
        } else {
          cls += ' locked-dim';
        }
      }

      optionsHtml += `
        <button type="button" class="${cls}" ${isLocked ? 'disabled' : ''} onclick="selectOption(${item.num}, '${L}')">
          <span>${L}. ${escapeHtml(item[L])}</span>
          ${badge}
        </button>
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
          <button type="button" class="primary-btn" style="padding:7px 14px; font-size:0.82rem;" onclick="toggleMissedRetry()">
            ${missedRetryMode ? '📖 Back to Review' : '🔄 Retry Missed'}
          </button>
          <button type="button" class="action-btn danger" onclick="clearAllMissed()">🧹 Clear All</button>
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
          <button type="button" class="primary-btn" style="padding:7px 14px; font-size:0.82rem;" onclick="toggleSavedPractice()">
            ${savedPracticeMode ? '📖 Study Saved' : '✍️ Practice Saved'}
          </button>
          <button type="button" class="action-btn danger" onclick="clearAllSaved()">🧹 Clear All</button>
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

    const disableOptionBtn = currentMode === 'study' || isLocked;

    let optionsHtml = '';
    for (const opt of opts) {
      let cls = 'mcq-option';
      let badge = '';
      if (disableOptionBtn) cls += ' locked';

      if (isRevealed) {
        if (opt.origLetter === item.ans) {
          cls += ' correct';
          badge = '<span class="opt-status-icon" aria-label="Correct">✅</span>';
        } else if (picked === opt.origLetter && opt.origLetter !== item.ans) {
          cls += ' wrong';
          badge = '<span class="opt-status-icon" aria-label="Incorrect">❌</span>';
        } else if (isLocked) {
          cls += ' locked-dim';
        }
      }

      optionsHtml += `
        <button type="button" class="${cls}" ${disableOptionBtn ? 'disabled' : ''} onclick="selectOption(${item.num}, '${opt.origLetter}')">
          <span>${opt.displayLetter}. ${escapeHtml(opt.text)}</span>
          ${badge}
        </button>
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
          <button type="button" class="done-pill-btn" onclick="clearMissedSingle(${item.num})">✅ Done</button>
        </div>
      `;
    } else if (currentMode === 'missed' && missedRetryMode) {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="width:100%;">
            ${isRevealed
              ? `${picked === item.ans ? '✅ Correct — removed from Missed' : '❌ Still incorrect'} • ${ansLabel}${keyTakeaway}`
              : 'Select an option above to test yourself'}
          </div>
        </div>
      `;
    } else if (currentMode === 'bookmarked' && !savedPracticeMode) {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">${ansLabel}${keyTakeaway}</div>
          <button type="button" class="done-pill-btn" onclick="clearSavedSingle(${item.num})">✅ Done</button>
        </div>
      `;
    } else if (currentMode === 'bookmarked' && savedPracticeMode) {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">${isRevealed ? `${ansLabel}${keyTakeaway}` : 'Select an option above to test yourself'}</div>
          ${isRevealed ? `<button type="button" class="done-pill-btn" onclick="clearSavedSingle(${item.num})">✅ Done</button>` : ''}
        </div>
      `;
    } else {
      footerBanner = `
        <div class="mcq-answer-banner">
          <div style="flex:1; min-width:220px;">${isRevealed ? `${ansLabel}${keyTakeaway}` : 'Select an option above'}</div>
          ${!isLocked ? `<button type="button" class="reveal-single-btn" onclick="toggleRevealSingle(${item.num})">Show Answer</button>` : ''}
        </div>
      `;
    }

    let extraDoneBtn = '';
    if (currentMode === 'missed') {
      extraDoneBtn = `<button type="button" class="done-pill-btn" onclick="event.stopPropagation(); clearMissedSingle(${item.num})">✅ Done</button>`;
    } else if (currentMode === 'bookmarked') {
      extraDoneBtn = `<button type="button" class="done-pill-btn" onclick="event.stopPropagation(); clearSavedSingle(${item.num})">✅ Done</button>`;
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
        <button type="button" class="page-btn" onclick="jumpToBatch(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span style="font-size:0.86rem; font-weight:700; color:var(--muted);">Page ${currentPage} of ${totalPages}</span>
        <button type="button" class="page-btn" onclick="jumpToBatch(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
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
    syncSidebarAccessibility();
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
    const optEls = activeCard.querySelectorAll('.mcq-option:not(:disabled)');
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
  configureQuizControls();
  syncSidebarAccessibility();
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