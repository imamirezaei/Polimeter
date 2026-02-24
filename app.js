import QUESTIONS from "./data/questions.js";

const QUIZ_SIZE = 20;
const LOCAL_ATTEMPT_KEY = "polimeter_attempt_count";
const THEME_KEY = "polimeter_theme_mode";

const QUIZ_STATES = {
  START: "start",
  IN_PROGRESS: "in-progress",
  RESULT: "result",
};

const TYPE_LABELS = {
  concept: "مفهوم",
  statement: "گزاره",
  definition: "تعریف",
};

const TYPE_QUOTAS = {
  concept: 7,
  statement: 7,
  definition: 6,
};

const state = {
  phase: QUIZ_STATES.START,
  questions: [],
  answers: [],
  currentIndex: 0,
  attemptCount: 0,
};

const dom = {
  startScreen: document.getElementById("screen-start"),
  quizScreen: document.getElementById("screen-quiz"),
  resultScreen: document.getElementById("screen-result"),
  attemptCount: document.getElementById("attempt-count"),
  startBtn: document.getElementById("start-btn"),
  questionIndex: document.getElementById("question-index"),
  questionTotal: document.getElementById("question-total"),
  typeBadge: document.getElementById("type-badge"),
  progressFill: document.getElementById("progress-fill"),
  questionText: document.getElementById("question-text"),
  leftBtn: document.getElementById("answer-left"),
  rightBtn: document.getElementById("answer-right"),
  nextBtn: document.getElementById("next-btn"),
  feedback: document.getElementById("feedback"),
  feedbackTitle: document.getElementById("feedback-title"),
  feedbackText: document.getElementById("feedback-text"),
  totalScore: document.getElementById("score-total"),
  leftScore: document.getElementById("score-left"),
  rightScore: document.getElementById("score-right"),
  correctCount: document.getElementById("correct-count"),
  wrongCount: document.getElementById("wrong-count"),
  conceptScore: document.getElementById("score-concept"),
  statementScore: document.getElementById("score-statement"),
  definitionScore: document.getElementById("score-definition"),
  restartBtn: document.getElementById("restart-btn"),
  themeButtons: Array.from(document.querySelectorAll(".theme-btn")),
};

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function percentage(correct, total) {
  if (!total) {
    return 0;
  }
  return Math.round((correct / total) * 100);
}

function readAttemptCount() {
  try {
    const value = Number(localStorage.getItem(LOCAL_ATTEMPT_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function writeAttemptCount(value) {
  try {
    localStorage.setItem(LOCAL_ATTEMPT_KEY, String(value));
  } catch {
    // ذخیره آماری اختیاری است.
  }
}

function readThemeMode() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return "system";
  } catch {
    return "system";
  }
}

function writeThemeMode(mode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // ذخیره تم اختیاری است.
  }
}

function applyTheme(mode) {
  const normalized = mode === "light" || mode === "dark" ? mode : "system";

  if (normalized === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", normalized);
  }

  dom.themeButtons.forEach((button) => {
    const isActive = button.dataset.themeMode === normalized;
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setPhase(nextPhase) {
  state.phase = nextPhase;
  dom.startScreen.classList.toggle("is-active", nextPhase === QUIZ_STATES.START);
  dom.quizScreen.classList.toggle("is-active", nextPhase === QUIZ_STATES.IN_PROGRESS);
  dom.resultScreen.classList.toggle("is-active", nextPhase === QUIZ_STATES.RESULT);
}

function getPoolsByTypeAndSide() {
  return {
    concept: {
      left: shuffle(
        QUESTIONS.filter(
          (question) =>
            question.type === "concept" && question.correct_side === "left",
        ),
      ),
      right: shuffle(
        QUESTIONS.filter(
          (question) =>
            question.type === "concept" && question.correct_side === "right",
        ),
      ),
    },
    statement: {
      left: shuffle(
        QUESTIONS.filter(
          (question) =>
            question.type === "statement" && question.correct_side === "left",
        ),
      ),
      right: shuffle(
        QUESTIONS.filter(
          (question) =>
            question.type === "statement" && question.correct_side === "right",
        ),
      ),
    },
    definition: {
      left: shuffle(
        QUESTIONS.filter(
          (question) =>
            question.type === "definition" && question.correct_side === "left",
        ),
      ),
      right: shuffle(
        QUESTIONS.filter(
          (question) =>
            question.type === "definition" && question.correct_side === "right",
        ),
      ),
    },
  };
}

function findBestLeftPlan(pools, targetLeftCount) {
  const types = Object.keys(TYPE_QUOTAS);

  const bounds = types.reduce((acc, type) => {
    const quota = TYPE_QUOTAS[type];
    acc[type] = {
      min: Math.max(0, quota - pools[type].right.length),
      max: Math.min(quota, pools[type].left.length),
    };
    return acc;
  }, {});

  const minPossibleTotal = types.reduce((sum, type) => sum + bounds[type].min, 0);
  const maxPossibleTotal = types.reduce((sum, type) => sum + bounds[type].max, 0);

  const safeTarget = Math.min(
    Math.max(targetLeftCount, minPossibleTotal),
    maxPossibleTotal,
  );

  let bestPlan = null;
  let bestBalanceError = Number.POSITIVE_INFINITY;
  let bestSymmetryError = Number.POSITIVE_INFINITY;

  function visit(index, partialPlan, partialLeftCount) {
    if (index === types.length) {
      const balanceError = Math.abs(partialLeftCount - safeTarget);
      const symmetryError = types.reduce((sum, type) => {
        return sum + Math.abs(partialPlan[type] - TYPE_QUOTAS[type] / 2);
      }, 0);

      if (
        balanceError < bestBalanceError ||
        (balanceError === bestBalanceError && symmetryError < bestSymmetryError)
      ) {
        bestPlan = { ...partialPlan };
        bestBalanceError = balanceError;
        bestSymmetryError = symmetryError;
      }
      return;
    }

    const type = types[index];
    const { min, max } = bounds[type];

    const remainingTypes = types.slice(index + 1);
    const remainingMin = remainingTypes.reduce(
      (sum, key) => sum + bounds[key].min,
      0,
    );
    const remainingMax = remainingTypes.reduce(
      (sum, key) => sum + bounds[key].max,
      0,
    );

    for (let leftCount = min; leftCount <= max; leftCount += 1) {
      const nextLeftCount = partialLeftCount + leftCount;
      if (nextLeftCount + remainingMin > safeTarget || nextLeftCount + remainingMax < safeTarget) {
        continue;
      }

      partialPlan[type] = leftCount;
      visit(index + 1, partialPlan, nextLeftCount);
    }
  }

  visit(0, {}, 0);

  if (bestPlan) {
    return bestPlan;
  }

  // fallback در حالت نادر: برنامه ساده می‌سازیم تا آزمون متوقف نشود.
  return {
    concept: Math.min(TYPE_QUOTAS.concept, pools.concept.left.length),
    statement: Math.min(TYPE_QUOTAS.statement, pools.statement.left.length),
    definition: Math.min(TYPE_QUOTAS.definition, pools.definition.left.length),
  };
}

function buildQuizQuestions() {
  const pools = getPoolsByTypeAndSide();
  const leftPlan = findBestLeftPlan(pools, QUIZ_SIZE / 2);

  const selected = [];
  Object.keys(TYPE_QUOTAS).forEach((type) => {
    const quota = TYPE_QUOTAS[type];
    const leftCount = leftPlan[type] ?? Math.floor(quota / 2);
    const rightCount = quota - leftCount;

    selected.push(...pools[type].left.slice(0, leftCount));
    selected.push(...pools[type].right.slice(0, rightCount));
  });

  return shuffle(selected).slice(0, QUIZ_SIZE);
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const questionNumber = state.currentIndex + 1;

  dom.questionIndex.textContent = String(questionNumber);
  dom.questionTotal.textContent = String(QUIZ_SIZE);
  dom.typeBadge.textContent = TYPE_LABELS[question.type] || question.type;
  dom.questionText.textContent = question.text;

  const progress = percentage(questionNumber, QUIZ_SIZE);
  dom.progressFill.style.width = `${progress}%`;

  dom.leftBtn.disabled = false;
  dom.rightBtn.disabled = false;
  dom.leftBtn.classList.remove("is-selected");
  dom.rightBtn.classList.remove("is-selected");

  dom.nextBtn.disabled = true;
  dom.nextBtn.textContent =
    questionNumber === QUIZ_SIZE ? "نمایش نتیجه" : "بعدی";

  dom.feedback.classList.add("is-hidden");
  dom.feedback.classList.remove("is-correct", "is-wrong");
}

function beginQuiz() {
  state.questions = buildQuizQuestions();
  state.answers = [];
  state.currentIndex = 0;

  setPhase(QUIZ_STATES.IN_PROGRESS);
  renderQuestion();
}

function chooseAnswer(selectedSide) {
  const question = state.questions[state.currentIndex];
  if (!question) {
    return;
  }

  const alreadyAnswered = state.answers.some(
    (entry) => entry.questionId === question.id,
  );

  if (alreadyAnswered) {
    return;
  }

  const isCorrect = selectedSide === question.correct_side;

  state.answers.push({
    questionId: question.id,
    selectedSide,
    isCorrect,
    type: question.type,
    correctSide: question.correct_side,
  });

  dom.leftBtn.disabled = true;
  dom.rightBtn.disabled = true;
  dom.nextBtn.disabled = false;

  dom.leftBtn.classList.toggle("is-selected", selectedSide === "left");
  dom.rightBtn.classList.toggle("is-selected", selectedSide === "right");

  dom.feedback.classList.remove("is-hidden");
  dom.feedback.classList.toggle("is-correct", isCorrect);
  dom.feedback.classList.toggle("is-wrong", !isCorrect);

  dom.feedbackTitle.textContent = isCorrect
    ? "پاسخ شما درست است."
    : "پاسخ شما نادرست است.";
  dom.feedbackText.textContent = question.explanation;
}

function nextQuestion() {
  const currentQuestion = state.questions[state.currentIndex];
  const isCurrentAnswered = state.answers.some(
    (entry) => entry.questionId === currentQuestion?.id,
  );

  if (!isCurrentAnswered) {
    return;
  }

  if (state.currentIndex < QUIZ_SIZE - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }

  showResults();
}

function computeMetrics() {
  const correctCount = state.answers.filter((entry) => entry.isCorrect).length;
  const wrongCount = state.answers.length - correctCount;

  const leftQuestions = state.questions.filter(
    (question) => question.correct_side === "left",
  );
  const rightQuestions = state.questions.filter(
    (question) => question.correct_side === "right",
  );

  const leftCorrect = state.answers.filter(
    (entry) => entry.correctSide === "left" && entry.isCorrect,
  ).length;
  const rightCorrect = state.answers.filter(
    (entry) => entry.correctSide === "right" && entry.isCorrect,
  ).length;

  const typeStats = ["concept", "statement", "definition"].reduce(
    (acc, type) => {
      const typeAnswers = state.answers.filter((entry) => entry.type === type);
      const typeCorrect = typeAnswers.filter((entry) => entry.isCorrect).length;
      acc[type] = percentage(typeCorrect, typeAnswers.length);
      return acc;
    },
    {},
  );

  return {
    totalScore: percentage(correctCount, QUIZ_SIZE),
    leftScore: percentage(leftCorrect, leftQuestions.length),
    rightScore: percentage(rightCorrect, rightQuestions.length),
    correctCount,
    wrongCount,
    typeStats,
  };
}

function showResults() {
  const metrics = computeMetrics();

  dom.totalScore.textContent = String(metrics.totalScore);
  dom.leftScore.textContent = String(metrics.leftScore);
  dom.rightScore.textContent = String(metrics.rightScore);

  dom.correctCount.textContent = String(metrics.correctCount);
  dom.wrongCount.textContent = String(metrics.wrongCount);

  dom.conceptScore.textContent = String(metrics.typeStats.concept);
  dom.statementScore.textContent = String(metrics.typeStats.statement);
  dom.definitionScore.textContent = String(metrics.typeStats.definition);

  state.attemptCount += 1;
  writeAttemptCount(state.attemptCount);
  dom.attemptCount.textContent = String(state.attemptCount);

  setPhase(QUIZ_STATES.RESULT);
}

function restartQuiz() {
  state.questions = [];
  state.answers = [];
  state.currentIndex = 0;

  setPhase(QUIZ_STATES.START);
}

function initialize() {
  state.attemptCount = readAttemptCount();
  dom.attemptCount.textContent = String(state.attemptCount);
  applyTheme(readThemeMode());

  dom.startBtn.addEventListener("click", beginQuiz);
  dom.leftBtn.addEventListener("click", () => chooseAnswer("left"));
  dom.rightBtn.addEventListener("click", () => chooseAnswer("right"));
  dom.nextBtn.addEventListener("click", nextQuestion);
  dom.restartBtn.addEventListener("click", restartQuiz);

  dom.themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.themeMode || "system";
      applyTheme(mode);
      writeThemeMode(mode);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (state.phase !== QUIZ_STATES.IN_PROGRESS) {
      return;
    }

    if (event.key === "ArrowLeft") {
      chooseAnswer("left");
    } else if (event.key === "ArrowRight") {
      chooseAnswer("right");
    } else if (event.key === "Enter") {
      nextQuestion();
    }
  });
}

initialize();
