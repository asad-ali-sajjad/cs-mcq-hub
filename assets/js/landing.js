(function () {
  // Interactive hero demo question
  const optionsContainer = document.getElementById("demoOptions");
  const feedbackEl = document.getElementById("demoFeedback");
  const retryBtn = document.getElementById("demoRetry");

  if (optionsContainer && feedbackEl && retryBtn) {
    const options = Array.from(optionsContainer.querySelectorAll(".demo-option"));

    options.forEach((option) => {
      option.addEventListener("click", () => {
        const isCorrect = option.hasAttribute("data-correct");

        options.forEach((btn) => {
          btn.disabled = true;
          if (btn.hasAttribute("data-correct")) {
            btn.classList.add("correct");
            btn.textContent += " ✓";
          }
        });

        if (!isCorrect) {
          option.classList.add("wrong");
          option.textContent += " ✗";
        }

        feedbackEl.textContent =
          (isCorrect ? "Correct! " : "Not quite. The answer is B. ") +
          "Deterministic finite automata recognise exactly the regular languages.";
        retryBtn.hidden = false;
      });
    });

    retryBtn.addEventListener("click", () => {
      options.forEach((btn) => {
        btn.disabled = false;
        btn.classList.remove("correct", "wrong");
        btn.textContent = btn.textContent.replace(/ [✓✗]$/, "");
      });
      feedbackEl.textContent = "Choose an answer.";
      retryBtn.hidden = true;
      if (options[0]) options[0].focus();
    });
  }

  // Native <dialog> modal triggers with focus restoration
  let lastFocusedTrigger = null;

  document.querySelectorAll("[data-modal]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const dialog = document.getElementById(trigger.dataset.modal);
      if (dialog && typeof dialog.showModal === "function") {
        lastFocusedTrigger = document.activeElement;
        dialog.showModal();
      }
    });
  });

  document.querySelectorAll("dialog.landing-dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("close", () => {
      if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function" && lastFocusedTrigger.isConnected) {
        lastFocusedTrigger.focus();
      }
    });
  });
})();