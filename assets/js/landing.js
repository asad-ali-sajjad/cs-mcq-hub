/* ==========================================================================
   ReviseLoop — Landing Page Interactive Sampler & Dialog Controller
   ========================================================================== */

(function () {
  const DEMO_SAMPLES = [
    {
      topic: "OS & Concurrency",
      subjectId: "os",
      q: "Which Coffman condition for deadlock is broken when a process must request all required resources before execution begins?",
      options: {
        A: "Mutual Exclusion",
        B: "Hold and Wait",
        C: "No Preemption",
        D: "Circular Wait"
      },
      ans: "B",
      explanation:
        "Requiring all resources up front guarantees a process never holds partial resources while waiting for others, breaking Hold and Wait."
    },
    {
      topic: "Computer Networks",
      subjectId: "computer-networks",
      q: "During TCP congestion control, how does the congestion window (cwnd) grow in the Slow Start phase before reaching ssthresh?",
      options: {
        A: "Linearly by 1 MSS per RTT",
        B: "Remains fixed until an ACK timeout",
        C: "Doubles every round-trip time (RTT)",
        D: "Halves on each duplicate ACK"
      },
      ans: "C",
      explanation:
        "In Slow Start, cwnd increases by 1 MSS for each ACK received, effectively doubling the window every RTT."
    },
    {
      topic: "Deep Learning",
      subjectId: "deep-learning",
      q: "Why are activations scaled by 1 / (1 - p) during training in Inverted Dropout (where p is the drop rate)?",
      options: {
        A: "So test-time inference needs no weight scaling",
        B: "To zero out gradients in frozen layers",
        C: "To prevent L2 weight decay from shrinking biases",
        D: "To double the effective learning rate"
      },
      ans: "A",
      explanation:
        "Scaling during training keeps expected activation magnitudes unchanged so inference runs at full speed without extra rescaling."
    }
  ];

  let currentSampleIdx = 0;
  let answeredCurrent = false;
  const solvedSamples = new Set();

  const demoCardEl = document.getElementById("demo-card");
  const progressFillEl = document.getElementById("demo-progress-fill");
  const topicEl = document.getElementById("demo-topic");
  const scoreEl = document.getElementById("demo-score");
  const counterEl = document.getElementById("demo-counter");
  const questionEl = document.getElementById("demo-question");
  const optionsEl = document.getElementById("demo-options");
  const feedbackEl = document.getElementById("demo-feedback");
  const retryBtn = document.getElementById("demo-retry-btn");
  const nextBtn = document.getElementById("demo-next-btn");
  const dotsEl = document.getElementById("demo-dots");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updateScorePill() {
    if (!scoreEl) return;
    if (solvedSamples.size === 0) {
      scoreEl.hidden = true;
      return;
    }
    scoreEl.hidden = false;
    scoreEl.textContent = `${solvedSamples.size} / ${DEMO_SAMPLES.length} solved`;
  }

  function renderDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = DEMO_SAMPLES.map((_, idx) => {
      const active = idx === currentSampleIdx;
      return `<button type="button" class="demo-dot${active ? " active" : ""}" data-sample-idx="${idx}" aria-label="Sample question ${idx + 1}" aria-pressed="${active}"></button>`;
    }).join("");
  }

  function renderSample(idx) {
    if (!questionEl || !optionsEl || !feedbackEl) return;
    currentSampleIdx = (idx + DEMO_SAMPLES.length) % DEMO_SAMPLES.length;
    answeredCurrent = false;

    const sample = DEMO_SAMPLES[currentSampleIdx];
    const pct = ((currentSampleIdx + 1) / DEMO_SAMPLES.length) * 100;

    if (progressFillEl) progressFillEl.style.width = `${pct}%`;
    if (topicEl) topicEl.textContent = sample.topic;
    if (counterEl) counterEl.textContent = `${currentSampleIdx + 1} / ${DEMO_SAMPLES.length}`;
    questionEl.textContent = sample.q;

    optionsEl.innerHTML = ["A", "B", "C", "D"]
      .map((letter) => {
        return `<button type="button" class="demo-opt" data-opt="${letter}"><span>${letter}. ${escapeHtml(sample.options[letter])}</span></button>`;
      })
      .join("");

    feedbackEl.textContent = "Choose an option above (or press A–D) to test instant feedback.";
    if (retryBtn) retryBtn.hidden = true;
    if (nextBtn) {
      nextBtn.textContent =
        currentSampleIdx === DEMO_SAMPLES.length - 1 ? "First sample ↺" : "Next sample →";
    }
    updateScorePill();
    renderDots();
  }

  function getReadySubjectLink(subjectId, topicLabel) {
    const catalog = Array.isArray(window.SUBJECTS_DATA) ? window.SUBJECTS_DATA : [];
    const match = catalog.find((s) => s && s.id === subjectId && s.ready);
    if (match) {
      return `<a href="quiz.html?subject=${encodeURIComponent(match.id)}" class="demo-subject-link">Practise more ${escapeHtml(match.title)} MCQs →</a>`;
    }
    return `<a href="#subjects" class="demo-subject-link">Explore ${escapeHtml(topicLabel)} &amp; all subjects →</a>`;
  }

  function handleOptionPick(pickedLetter) {
    if (answeredCurrent || !optionsEl || !feedbackEl) return;
    answeredCurrent = true;

    const sample = DEMO_SAMPLES[currentSampleIdx];
    const isCorrect = pickedLetter === sample.ans;
    if (isCorrect) {
      solvedSamples.add(currentSampleIdx);
      updateScorePill();
    }

    optionsEl.querySelectorAll(".demo-opt").forEach((btn) => {
      const opt = btn.dataset.opt;
      btn.disabled = true;
      if (opt === sample.ans) {
        btn.classList.add("is-correct");
        btn.insertAdjacentHTML("beforeend", `<span aria-label="Correct">✓</span>`);
      } else if (opt === pickedLetter) {
        btn.classList.add("is-wrong");
        btn.insertAdjacentHTML("beforeend", `<span aria-label="Incorrect">✕</span>`);
      } else {
        btn.classList.add("is-dimmed");
      }
    });

    const verdict = isCorrect
      ? `<strong>Spot on!</strong>`
      : `<strong>Answer: ${sample.ans}.</strong>`;
    const subjectLink = getReadySubjectLink(sample.subjectId, sample.topic);
    feedbackEl.innerHTML = `${verdict} ${escapeHtml(sample.explanation)}<br>${subjectLink}`;

    if (retryBtn) {
      retryBtn.hidden = isCorrect;
    }
  }

  if (optionsEl) {
    optionsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".demo-opt");
      if (!btn || btn.disabled) return;
      handleOptionPick(btn.dataset.opt);
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      renderSample(currentSampleIdx);
      const firstOpt = optionsEl && optionsEl.querySelector(".demo-opt");
      if (firstOpt) firstOpt.focus();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      renderSample(currentSampleIdx + 1);
    });
  }

  if (dotsEl) {
    dotsEl.addEventListener("click", (e) => {
      const dot = e.target.closest(".demo-dot");
      if (!dot) return;
      const targetIdx = parseInt(dot.dataset.sampleIdx, 10);
      if (Number.isFinite(targetIdx)) {
        renderSample(targetIdx);
      }
    });
  }

  // Keyboard support (A-D or 1-4) when focused inside the sampler card
  if (demoCardEl) {
    demoCardEl.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const map = { "1": "A", "2": "B", "3": "C", "4": "D", A: "A", B: "B", C: "C", D: "D" };
      if (map[key] && !answeredCurrent) {
        e.preventDefault();
        handleOptionPick(map[key]);
      }
    });
  }

  renderSample(0);

  // Global "/" search shortcut & "Esc" to clear search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && searchInput.value) {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  // Native <dialog> Modals with focus restoration & modal switching
  let lastDialogTrigger = null;

  document.querySelectorAll("[data-open-dialog]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const dialogId = trigger.getAttribute("data-open-dialog");
      const dialog = dialogId ? document.getElementById(dialogId) : null;
      if (dialog && typeof dialog.showModal === "function") {
        lastDialogTrigger = document.activeElement;
        dialog.showModal();
      }
    });
  });

  document.querySelectorAll("[data-switch-dialog]").forEach((switcher) => {
    switcher.addEventListener("click", () => {
      const currentDialog = switcher.closest("dialog");
      const targetId = switcher.getAttribute("data-switch-dialog");
      const targetDialog = targetId ? document.getElementById(targetId) : null;
      if (currentDialog && currentDialog.open) {
        currentDialog.close();
      }
      if (targetDialog && typeof targetDialog.showModal === "function") {
        targetDialog.showModal();
      }
    });
  });

  document.querySelectorAll("dialog.info-dialog").forEach((dialog) => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("close", () => {
      if (lastDialogTrigger && typeof lastDialogTrigger.focus === "function" && lastDialogTrigger.isConnected) {
        lastDialogTrigger.focus();
      }
    });

    dialog.querySelectorAll("[data-close-dialog]").forEach((closeEl) => {
      closeEl.addEventListener("click", () => dialog.close());
    });
  });
})();