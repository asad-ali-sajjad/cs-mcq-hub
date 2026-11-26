#!/usr/bin/env node
/* ==========================================================================
   CS MCQ Hub — Automated MCQ Bank & Catalog Validator
   Zero external dependencies (uses built-in Node.js fs, path, vm).
   Run locally: node scripts/validate-banks.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SUBJECTS_FILE = path.join(ROOT, "assets", "js", "subjects-data.js");
const DATA_DIR = path.join(ROOT, "data");
const VALID_ANSWERS = new Set(["A", "B", "C", "D"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const errors = [];
const warnings = [];
const summary = [];
const placeholders = [];

function addError(scope, message) {
  errors.push(`[${scope}] ${message}`);
}

function addWarning(scope, message) {
  warnings.push(`[${scope}] ${message}`);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (/\.(js|json)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function loadJsInSandbox(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  if (/^\s*(import|export)\s+/m.test(code)) {
    throw new Error('ES module "import/export" syntax is not allowed (banks must load via <script> and file://).');
  }
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    `${code}\n; globalThis.__EXPORTED__ = { exam: window.EXAM_DATA || window.QUIZ_DATA || window.SUBJECT_DATA || null, mcqs: typeof MCQS !== "undefined" ? MCQS : (window.MCQS || null), subjects: typeof SUBJECTS_DATA !== "undefined" ? SUBJECTS_DATA : (window.SUBJECTS_DATA || null) };`,
    sandbox,
    { filename: filePath }
  );
  return sandbox.__EXPORTED__;
}

function getCandidatePathsForSubject(sub) {
  const explicit = sub.dataFile || sub.file || sub.path || sub.dataPath || sub.src;
  return [
    explicit,
    `data/sem-7/${sub.id}.js`,
    `data/sem-8/${sub.id}.js`,
    `data/core-cs/${sub.id}.js`
  ]
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"));
}

function loadCatalogIndex() {
  const index = { subjects: [], byId: new Map(), byPath: new Map() };

  if (!fs.existsSync(SUBJECTS_FILE)) {
    addError("assets/js/subjects-data.js", "Catalog file does not exist.");
    return index;
  }

  let subjects;
  try {
    const out = loadJsInSandbox(SUBJECTS_FILE);
    subjects = out.subjects;
  } catch (err) {
    addError("assets/js/subjects-data.js", `Failed to load catalog: ${err.message}`);
    return index;
  }

  if (!Array.isArray(subjects) || subjects.length === 0) {
    addError("assets/js/subjects-data.js", "SUBJECTS_DATA must be a non-empty array.");
    return index;
  }

  index.subjects = subjects;
  for (const sub of subjects) {
    if (sub && typeof sub.id === "string") {
      index.byId.set(sub.id, sub);
      for (const relPath of getCandidatePathsForSubject(sub)) {
        index.byPath.set(relPath, sub);
      }
    }
  }
  return index;
}

function parseBankFile(filePath) {
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (filePath.toLowerCase().endsWith(".json")) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const mcqs = Array.isArray(raw) ? raw : raw.mcqs || raw.questions || null;
    const topics = !Array.isArray(raw) && Array.isArray(raw.topics) ? raw.topics : [];
    const id = !Array.isArray(raw) && raw.id ? String(raw.id) : path.basename(filePath, ".json");
    return { relPath, id, topics, mcqs };
  }

  const out = loadJsInSandbox(filePath);
  const exam = out.exam || {};
  const mcqs = exam.mcqs || exam.questions || out.mcqs || null;
  const topics = Array.isArray(exam.topics) ? exam.topics : [];
  const id = exam.id ? String(exam.id) : path.basename(filePath, ".js");
  return { relPath, id, topics, mcqs };
}

function validateBank(filePath, catalogIndex) {
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, "/");
  let parsed;
  try {
    parsed = parseBankFile(filePath);
  } catch (err) {
    addError(relPath, `Failed to parse/execute file: ${err.message}`);
    return null;
  }

  const { id, topics, mcqs } = parsed;
  const matchedSubject = catalogIndex.byPath.get(relPath) || catalogIndex.byId.get(id);
  const isUpcoming = Boolean(matchedSubject && matchedSubject.ready === false);

  if (!Array.isArray(mcqs) || mcqs.length === 0) {
    if (isUpcoming) {
      placeholders.push({ relPath, id });
      return { relPath, id, count: 0, upcoming: true };
    }
    addError(relPath, 'Must define a non-empty "mcqs" array.');
    return null;
  }

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    if (!t || !t.id || !t.label || !t.pattern) {
      addError(relPath, `Topic #${i + 1} must include "id", "label", and "pattern".`);
      continue;
    }
    try {
      new RegExp(t.pattern, "i");
    } catch (err) {
      addError(relPath, `Topic "${t.id}" has invalid regex pattern "${t.pattern}": ${err.message}`);
    }
  }

  const seenNums = new Set();
  for (let i = 0; i < mcqs.length; i++) {
    const m = mcqs[i];
    const qLabel = `Q#${m && m.num != null ? m.num : i + 1} (index ${i})`;

    if (!m || typeof m !== "object") {
      addError(relPath, `${qLabel} is not an object.`);
      continue;
    }

    if (m.num != null) {
      const numVal = Number(m.num);
      if (!Number.isFinite(numVal)) {
        addError(relPath, `${qLabel} has non-numeric "num": ${m.num}`);
      } else if (seenNums.has(numVal)) {
        addError(relPath, `Duplicate question number "num: ${numVal}" at index ${i}.`);
      } else {
        seenNums.add(numVal);
      }
    }

    const qText = String(m.q || m.question || "").trim();
    if (!qText) {
      addError(relPath, `${qLabel} is missing non-empty question text ("q").`);
    }

    const opts = m.options || {};
    for (const letter of VALID_ANSWERS) {
      const val = m[letter] !== undefined ? m[letter] : opts[letter];
      if (val === undefined || val === null || String(val).trim() === "") {
        addError(relPath, `${qLabel} is missing option "${letter}".`);
      }
    }

    const ans = String(m.ans || m.answer || "").trim().toUpperCase();
    if (!VALID_ANSWERS.has(ans)) {
      addError(relPath, `${qLabel} has invalid "ans": "${m.ans}" (expected A, B, C, or D).`);
    }

    if (m.difficulty !== undefined && m.difficulty !== null && String(m.difficulty).trim() !== "") {
      const diff = String(m.difficulty).trim().toLowerCase();
      if (!VALID_DIFFICULTIES.has(diff)) {
        addError(relPath, `${qLabel} has invalid "difficulty": "${m.difficulty}" (expected easy, medium, or hard).`);
      }
    }
  }

  summary.push({ relPath, id, count: mcqs.length });
  return { relPath, id, count: mcqs.length, upcoming: false };
}

function validateCatalog(catalogIndex, bankById, bankByRelPath) {
  const seenIds = new Set();

  for (let i = 0; i < catalogIndex.subjects.length; i++) {
    const sub = catalogIndex.subjects[i];
    const label = `Entry #${i + 1}${sub && sub.id ? ` (${sub.id})` : ""}`;

    if (!sub || typeof sub !== "object") {
      addError("subjects-data.js", `${label} is not an object.`);
      continue;
    }
    if (!sub.id || typeof sub.id !== "string") {
      addError("subjects-data.js", `${label} is missing a string "id".`);
      continue;
    }
    if (seenIds.has(sub.id)) {
      addError("subjects-data.js", `Duplicate subject id "${sub.id}".`);
    }
    seenIds.add(sub.id);

    if (!sub.title || !String(sub.title).trim()) {
      addError("subjects-data.js", `${label} is missing "title".`);
    }

    const candidates = getCandidatePathsForSubject(sub);
    const matchedBank =
      candidates.map((c) => bankByRelPath.get(c)).find(Boolean) ||
      bankById.get(sub.id);

    if (sub.ready) {
      if (!matchedBank || matchedBank.count === 0) {
        addError(
          "subjects-data.js",
          `Ready subject "${sub.id}" has no populated bank file (checked: ${[...new Set(candidates)].join(", ")}).`
        );
      } else if (typeof sub.questionCount === "number" && sub.questionCount !== matchedBank.count) {
        addWarning(
          "subjects-data.js",
          `Subject "${sub.id}" declares questionCount: ${sub.questionCount}, but ${matchedBank.relPath} has ${matchedBank.count} MCQs.`
        );
      }
    } else if (matchedBank && matchedBank.count > 0) {
      addWarning(
        "subjects-data.js",
        `Subject "${sub.id}" has ready: false, but ${matchedBank.relPath} already contains ${matchedBank.count} MCQs.`
      );
    }
  }
}

function main() {
  const catalogIndex = loadCatalogIndex();
  const bankFiles = walkFiles(DATA_DIR);

  if (bankFiles.length === 0) {
    addError("data/", "No .js or .json MCQ bank files found under data/.");
  }

  const bankById = new Map();
  const bankByRelPath = new Map();

  for (const filePath of bankFiles) {
    const info = validateBank(filePath, catalogIndex);
    if (info) {
      bankById.set(info.id, info);
      bankByRelPath.set(info.relPath, info);
    }
  }

  validateCatalog(catalogIndex, bankById, bankByRelPath);

  console.log("=== CS MCQ Hub — Question Bank Validation ===");
  for (const item of summary) {
    console.log(`  ✅ ${item.relPath} (${item.count} MCQs)`);
  }
  for (const item of placeholders) {
    console.log(`  🔵 ${item.relPath} (upcoming placeholder)`);
  }

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (errors.length > 0) {
    console.error("\nValidation Errors:");
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const totalQuestions = summary.reduce((acc, s) => acc + s.count, 0);
  console.log(`\nPassed: ${summary.length} active bank(s), ${totalQuestions} total MCQs validated.`);
}

main();