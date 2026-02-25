import QUESTIONS from "./data/questions.js";

const QUIZ_SIZE = 20;
const QUIZ_VERSION = "v1";
const LOCAL_ATTEMPT_KEY = "polimeter_start_count_local";
const THEME_KEY = "polimeter_theme_mode";
const API_TIMEOUT_MS = 6000;

const metaApiBase = document
  .querySelector('meta[name="polimeter-api-base-url"]')
  ?.getAttribute("content")
  ?.trim();

const API_BASE_URL =
  (typeof window !== "undefined" && window.POLIMETER_API_BASE_URL) ||
  metaApiBase ||
  "";

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
  startCountLocal: 0,
  startCountRemote: null,
  apiAvailable: false,
  consentToStoreAnswers: false,
  startedAt: null,
};

const dom = {
  startScreen: document.getElementById("screen-start"),
  quizScreen: document.getElementById("screen-quiz"),
  resultScreen: document.getElementById("screen-result"),
  attemptCount: document.getElementById("attempt-count"),
  startCountLabel: document.getElementById("start-count-label"),
  consentCheckbox: document.getElementById("consent-checkbox"),
  apiStatus: document.getElementById("api-status"),
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

function toApiUrl(pathname) {
  const base = String(API_BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    return pathname;
  }
  return `${base}${pathname}`;
}

async function apiRequest(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(toApiUrl(pathname), {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const message = body?.error || `request_failed_${response.status}`;
      throw new Error(message);
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function setApiStatus(message, type = "info") {
  if (!dom.apiStatus) {
    return;
  }

  if (!message) {
    dom.apiStatus.textContent = "";
    dom.apiStatus.className = "api-status is-hidden";
    return;
  }

  dom.apiStatus.textContent = message;
  dom.apiStatus.className = `api-status ${type}`;
}

function updateStartCounter(count, source = "local") {
  dom.attemptCount.textContent = String(count);
  dom.startCountLabel.textContent =
    source === "remote"
      ? "تعداد شروع آزمون (سراسری):"
      : "تعداد شروع آزمون (این مرورگر):";
}

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

function readStartCountLocal() {
  try {
    const value = Number(localStorage.getItem(LOCAL_ATTEMPT_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function writeStartCountLocal(value) {
  try {
    localStorage.setItem(LOCAL_ATTEMPT_KEY, String(value));
  } catch {
    // ذخیره local اختیاری است.
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
  dom.quizScreen.classList.toggle(
    "is-active",
    nextPhase === QUIZ_STATES.IN_PROGRESS,
  );
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
      if (
        nextLeftCount + remainingMin > safeTarget ||
        nextLeftCount + remainingMax < safeTarget
      ) {
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

async function registerStartEvent(startedAt) {
  state.startCountLocal += 1;
  writeStartCountLocal(state.startCountLocal);
  updateStartCounter(state.startCountLocal, "local");

  try {
    const data = await apiRequest("/api/metrics/start", {
      method: "POST",
      body: JSON.stringify({
        started_at: startedAt,
        quiz_version: QUIZ_VERSION,
      }),
    });

    const startCount = Number(data?.start_count);
    if (Number.isFinite(startCount)) {
      state.startCountRemote = startCount;
      state.apiAvailable = true;
      updateStartCounter(startCount, "remote");
      if (!state.consentToStoreAnswers) {
        setApiStatus(
          "آزمون شروع شد. چون تیک ذخیره فعال نیست، پاسخ‌ها ذخیره نخواهند شد.",
          "info",
        );
      }
    }
  } catch {
    state.apiAvailable = false;
    setApiStatus(
      "ثبت آماری سرور فعلا در دسترس نیست. آزمون بدون اختلال ادامه پیدا می‌کند.",
      "warning",
    );
  }
}

function beginQuiz() {
  state.consentToStoreAnswers = Boolean(dom.consentCheckbox?.checked);
  state.startedAt = new Date().toISOString();
  state.questions = buildQuizQuestions();
  state.answers = [];
  state.currentIndex = 0;

  setPhase(QUIZ_STATES.IN_PROGRESS);
  renderQuestion();

  if (state.consentToStoreAnswers) {
    setApiStatus(
      "با رضایت شما، پاسخ‌ها پس از پایان آزمون به‌صورت ناشناس ذخیره می‌شود.",
      "info",
    );
  } else {
    setApiStatus(
      "آزمون بدون ذخیره پاسخ شما اجرا می‌شود.",
      "info",
    );
  }

  void registerStartEvent(state.startedAt);
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

async function submitAnswersIfConsented(completedAt) {
  if (!state.consentToStoreAnswers) {
    return;
  }

  const payload = {
    consent_to_store_answers: true,
    quiz_version: QUIZ_VERSION,
    started_at: state.startedAt,
    completed_at: completedAt,
    answers: state.answers.map((answer) => ({
      question_id: answer.questionId,
      selected_side: answer.selectedSide,
    })),
  };

  try {
    await apiRequest("/api/submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setApiStatus("پاسخ‌های این آزمون به‌صورت ناشناس ذخیره شد.", "success");
  } catch {
    setApiStatus(
      "ثبت پاسخ‌ها انجام نشد، اما نتیجه آزمون شما محفوظ است.",
      "warning",
    );
  }
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

  setPhase(QUIZ_STATES.RESULT);

  const completedAt = new Date().toISOString();
  void submitAnswersIfConsented(completedAt);
}

function restartQuiz() {
  state.questions = [];
  state.answers = [];
  state.currentIndex = 0;
  state.consentToStoreAnswers = false;
  state.startedAt = null;

  setPhase(QUIZ_STATES.START);
}

async function syncCounterOnLoad() {
  state.startCountLocal = readStartCountLocal();
  updateStartCounter(state.startCountLocal, "local");

  try {
    const data = await apiRequest("/api/metrics", { method: "GET" });
    const startCount = Number(data?.start_count);
    if (Number.isFinite(startCount)) {
      state.startCountRemote = startCount;
      state.apiAvailable = true;
      updateStartCounter(startCount, "remote");
      setApiStatus("اتصال به سرویس آمار برقرار است.", "success");
      return;
    }

    throw new Error("invalid_metric_payload");
  } catch {
    state.apiAvailable = false;
    setApiStatus(
      "سرویس آمار در دسترس نیست. شمارنده فقط در همین مرورگر نمایش داده می‌شود.",
      "warning",
    );
  }
}

function initialize() {
  applyTheme(readThemeMode());
  void syncCounterOnLoad();

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
