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

const SIDE_LABELS = {
  left: "چپ",
  right: "راست",
};

const AXES = [
  "economic",
  "domestic_policy",
  "foreign_policy",
  "historical",
  "national_security",
];
const AXIS_FALLBACK_KEY = "__unassigned__";

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
  reviewList: document.getElementById("review-list"),
  reviewEmpty: document.getElementById("review-empty"),
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

function isValidAxis(axis) {
  return AXES.includes(axis);
}

function buildAxisPools() {
  const pools = new Map();
  AXES.forEach((axis) => pools.set(axis, []));
  pools.set(AXIS_FALLBACK_KEY, []);

  for (const question of QUESTIONS) {
    if (isValidAxis(question.axis)) {
      pools.get(question.axis).push(question);
    } else {
      pools.get(AXIS_FALLBACK_KEY).push(question);
    }
  }

  for (const [key, items] of pools.entries()) {
    pools.set(key, shuffle(items));
  }

  return pools;
}

function buildAxisTargets(totalQuestions) {
  const targets = Object.fromEntries(AXES.map((axis) => [axis, 0]));
  if (totalQuestions <= 0) {
    return targets;
  }

  if (totalQuestions < AXES.length) {
    const order = shuffle([...AXES]);
    order.slice(0, totalQuestions).forEach((axis) => {
      targets[axis] += 1;
    });
    return targets;
  }

  const baseShare = Math.floor(totalQuestions / AXES.length);
  const remainder = totalQuestions - baseShare * AXES.length;

  AXES.forEach((axis) => {
    targets[axis] = baseShare;
  });

  shuffle([...AXES])
    .slice(0, remainder)
    .forEach((axis) => {
      targets[axis] += 1;
    });

  return targets;
}

function computeAxisCounts(questions) {
  const counts = Object.fromEntries(AXES.map((axis) => [axis, 0]));
  counts.unassigned = 0;

  for (const question of questions) {
    if (isValidAxis(question.axis)) {
      counts[question.axis] += 1;
    } else {
      counts.unassigned += 1;
    }
  }

  return counts;
}

function buildQuizQuestions() {
  const pools = buildAxisPools();
  const targets = buildAxisTargets(QUIZ_SIZE);
  const selected = [];
  const selectedByAxis = Object.fromEntries(AXES.map((axis) => [axis, 0]));
  const fallbackEvents = [];
  let shortage = 0;

  for (const axis of AXES) {
    const axisPool = pools.get(axis) || [];
    const target = targets[axis] || 0;
    const take = Math.min(target, axisPool.length);
    if (take > 0) {
      selected.push(...axisPool.splice(0, take));
      selectedByAxis[axis] += take;
    }

    if (take < target) {
      shortage += target - take;
      fallbackEvents.push(
        `axis_shortage axis=${axis} target=${target} available=${axisPool.length + take}`,
      );
    }
  }

  while (shortage > 0) {
    const candidateAxes = AXES.filter((axis) => (pools.get(axis) || []).length > 0);
    if (!candidateAxes.length) {
      break;
    }

    const minSelected = Math.min(...candidateAxes.map((axis) => selectedByAxis[axis] || 0));
    const bestAxes = candidateAxes.filter(
      (axis) => (selectedByAxis[axis] || 0) === minSelected,
    );
    const chosenAxis = bestAxes[Math.floor(Math.random() * bestAxes.length)];
    const axisPool = pools.get(chosenAxis);
    const item = axisPool.shift();
    if (!item) {
      break;
    }

    selected.push(item);
    selectedByAxis[chosenAxis] += 1;
    shortage -= 1;
  }

  if (shortage > 0) {
    const fallbackPool = pools.get(AXIS_FALLBACK_KEY) || [];
    const take = Math.min(shortage, fallbackPool.length);
    if (take > 0) {
      selected.push(...fallbackPool.splice(0, take));
      shortage -= take;
      fallbackEvents.push(`fallback_from_unassigned count=${take}`);
    }
  }

  if (selected.length < QUIZ_SIZE) {
    const remaining = shuffle(
      AXES.flatMap((axis) => pools.get(axis) || []).concat(pools.get(AXIS_FALLBACK_KEY) || []),
    );
    const needed = QUIZ_SIZE - selected.length;
    if (needed > 0) {
      selected.push(...remaining.slice(0, needed));
      fallbackEvents.push(`global_fallback_fill count=${Math.min(needed, remaining.length)}`);
    }
  }

  if (selected.length !== QUIZ_SIZE) {
    throw new Error(`quiz_size_mismatch expected=${QUIZ_SIZE} actual=${selected.length}`);
  }

  const axisCounts = computeAxisCounts(selected);
  if (fallbackEvents.length > 0) {
    console.warn(`[quiz-selection] axis fallback applied: ${fallbackEvents.join(" | ")}`);
  }
  console.info("[quiz-selection] counts.selected_axis", axisCounts);

  return shuffle(selected);
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const questionNumber = state.currentIndex + 1;
  const totalQuestions = state.questions.length || QUIZ_SIZE;

  dom.questionIndex.textContent = String(questionNumber);
  dom.questionTotal.textContent = String(totalQuestions);
  dom.typeBadge.textContent = TYPE_LABELS[question.type] || question.type;
  dom.questionText.textContent = question.text;

  const progress = percentage(questionNumber, totalQuestions);
  dom.progressFill.style.width = `${progress}%`;

  dom.leftBtn.disabled = false;
  dom.rightBtn.disabled = false;
  dom.leftBtn.classList.remove("is-selected");
  dom.rightBtn.classList.remove("is-selected");

  dom.nextBtn.disabled = true;
  dom.nextBtn.textContent =
    questionNumber === totalQuestions ? "نمایش نتیجه" : "بعدی";

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

  const isCorrect = selectedSide === question.correct_side;
  const existingIndex = state.answers.findIndex(
    (entry) => entry.questionId === question.id,
  );

  const nextAnswer = {
    questionId: question.id,
    selectedSide,
    isCorrect,
    type: question.type,
    correctSide: question.correct_side,
    questionText: question.text,
    explanation: question.explanation,
  };

  if (existingIndex >= 0) {
    state.answers[existingIndex] = nextAnswer;
  } else {
    state.answers.push(nextAnswer);
  }

  dom.nextBtn.disabled = false;

  dom.leftBtn.classList.toggle("is-selected", selectedSide === "left");
  dom.rightBtn.classList.toggle("is-selected", selectedSide === "right");
}

function nextQuestion() {
  const currentQuestion = state.questions[state.currentIndex];
  const isCurrentAnswered = state.answers.some(
    (entry) => entry.questionId === currentQuestion?.id,
  );

  if (!isCurrentAnswered) {
    return;
  }

  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }

  showResults();
}

function computeMetrics() {
  const totalQuestions = state.questions.length || QUIZ_SIZE;
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
    totalScore: percentage(correctCount, totalQuestions),
    leftScore: percentage(leftCorrect, leftQuestions.length),
    rightScore: percentage(rightCorrect, rightQuestions.length),
    correctCount,
    wrongCount,
    totalQuestions,
    typeStats,
  };
}

function renderReviewList() {
  if (!dom.reviewList || !dom.reviewEmpty) {
    return;
  }

  dom.reviewList.innerHTML = "";
  if (!state.answers.length) {
    dom.reviewEmpty.classList.remove("is-hidden");
    return;
  }

  dom.reviewEmpty.classList.add("is-hidden");

  const renderViewBlock = (titleText, view) => {
    if (!view || typeof view !== "object") {
      return null;
    }

    const summary = String(view.summary || "").trim();
    const keyDistinction = String(view.key_distinction || "").trim();
    if (!summary && !keyDistinction) {
      return null;
    }

    const wrapper = document.createElement("section");
    wrapper.className = "review-view";

    const title = document.createElement("p");
    title.className = "review-view-title";
    title.textContent = `${titleText} (${SIDE_LABELS[view.side] || view.side})`;
    wrapper.appendChild(title);

    if (summary) {
      const summaryEl = document.createElement("p");
      summaryEl.className = "review-view-summary";
      summaryEl.textContent = summary;
      wrapper.appendChild(summaryEl);
    }

    if (keyDistinction) {
      const distinctionEl = document.createElement("p");
      distinctionEl.className = "review-view-distinction";
      distinctionEl.textContent = keyDistinction;
      wrapper.appendChild(distinctionEl);
    }

    return wrapper;
  };

  const renderLearningLinks = (links) => {
    if (!Array.isArray(links) || !links.length) {
      return null;
    }

    const normalized = links.filter((link) => {
      if (!link || typeof link !== "object") {
        return false;
      }
      const title = String(link.title || "").trim();
      const url = String(link.url || "").trim();
      return Boolean(title && url);
    });

    if (!normalized.length) {
      return null;
    }

    const section = document.createElement("section");
    section.className = "review-links";

    const title = document.createElement("p");
    title.className = "review-links-title";
    title.textContent = "مطالعه بیشتر";
    section.appendChild(title);

    const list = document.createElement("ul");
    list.className = "review-links-list";
    for (const link of normalized) {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = String(link.url);
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = String(link.title);
      item.appendChild(anchor);
      list.appendChild(item);
    }

    section.appendChild(list);
    return section;
  };

  state.questions.forEach((question, index) => {
    const answer = state.answers.find((entry) => entry.questionId === question.id);
    if (!answer) {
      return;
    }

    const item = document.createElement("article");
    item.className = `review-item ${answer.isCorrect ? "is-correct" : "is-wrong"}`;

    const head = document.createElement("div");
    head.className = "review-head";

    const title = document.createElement("p");
    title.className = "review-title";
    title.textContent = `سوال ${index + 1} · ${TYPE_LABELS[question.type] || question.type}`;

    const status = document.createElement("p");
    status.className = "review-status";
    status.textContent = answer.isCorrect ? "درست" : "نادرست";

    head.append(title, status);

    const text = document.createElement("p");
    text.className = "review-question";
    text.textContent = question.text;

    const choices = document.createElement("p");
    choices.className = "review-choices";
    choices.textContent = `پاسخ شما: ${SIDE_LABELS[answer.selectedSide]} | پاسخ درست: ${SIDE_LABELS[question.correct_side]}`;

    const explanation = document.createElement("p");
    explanation.className = "review-explanation";
    explanation.textContent = question.explanation;

    item.append(head, text, choices, explanation);

    const correctViewBlock = renderViewBlock("دیدگاه درست", question.correct_view);
    if (correctViewBlock) {
      item.appendChild(correctViewBlock);
    }

    const counterViewBlock = renderViewBlock("دیدگاه مقابل", question.counter_view);
    if (counterViewBlock) {
      item.appendChild(counterViewBlock);
    }

    const linksBlock = renderLearningLinks(question.learning_links);
    if (linksBlock) {
      item.appendChild(linksBlock);
    }

    dom.reviewList.appendChild(item);
  });
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
  renderReviewList();

  const completedAt = new Date().toISOString();
  void submitAnswersIfConsented(completedAt);
}

function restartQuiz() {
  state.questions = [];
  state.answers = [];
  state.currentIndex = 0;
  state.consentToStoreAnswers = false;
  state.startedAt = null;
  if (dom.reviewList) {
    dom.reviewList.innerHTML = "";
  }
  if (dom.reviewEmpty) {
    dom.reviewEmpty.classList.add("is-hidden");
  }

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
