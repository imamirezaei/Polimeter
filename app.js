import QUESTIONS from "./data/questions.js";

const QUIZ_SIZE = 20;
const QUIZ_VERSION = "v1";
const LOCAL_ATTEMPT_KEY = "polimeter_start_count_local";
const API_TIMEOUT_MS = 6000;
const COUNTER_DIGITS = 6;
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const PUBLIC_COUNTER_BASE_URL = "https://api.countapi.xyz";

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

const SIDE_LABELS = {
  left: "چپ",
  right: "راست",
  neutral: "نظری ندارم",
};

const AXES = [
  "economic",
  "domestic_policy",
  "foreign_policy",
  "historical",
  "national_security",
];
const AXIS_FALLBACK_KEY = "__unassigned__";
const AXIS_LABELS = {
  economic: "اقتصادی",
  domestic_policy: "سیاست داخلی",
  foreign_policy: "سیاست خارجی",
  historical: "تاریخی",
  national_security: "امنیت ملی",
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
  autoAdvanceTimer: null,
  lastMetrics: null,
};

const dom = {
  page: document.querySelector(".page"),
  startScreen: document.getElementById("screen-start"),
  quizScreen: document.getElementById("screen-quiz"),
  resultScreen: document.getElementById("screen-result"),
  attemptCounterBoard: document.getElementById("attempt-counter-board"),
  consentCheckbox: document.getElementById("consent-checkbox"),
  startBtn: document.getElementById("start-btn"),
  questionIndex: document.getElementById("question-index"),
  questionTotal: document.getElementById("question-total"),
  typeBadge: document.getElementById("type-badge"),
  progressFill: document.getElementById("progress-fill"),
  questionText: document.getElementById("question-text"),
  leftBtn: document.getElementById("answer-left"),
  rightBtn: document.getElementById("answer-right"),
  neutralBtn: document.getElementById("answer-neutral"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  nextAction: document.getElementById("quiz-result-action"),
  scoreCardTotal: document.getElementById("score-card-total"),
  scoreCardLeft: document.getElementById("score-card-left"),
  scoreCardRight: document.getElementById("score-card-right"),
  totalScore: document.getElementById("score-total"),
  leftScore: document.getElementById("score-left"),
  rightScore: document.getElementById("score-right"),
  correctCount: document.getElementById("correct-count"),
  wrongCount: document.getElementById("wrong-count"),
  axisBreakdown: document.getElementById("axis-breakdown"),
  reviewList: document.getElementById("review-list"),
  reviewEmpty: document.getElementById("review-empty"),
  shareBtn: document.getElementById("share-btn"),
  restartBtn: document.getElementById("restart-btn"),
};

function toApiUrl(pathname) {
  const base = String(API_BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    return pathname;
  }
  return `${base}${pathname}`;
}

function hasExplicitApiBase() {
  return Boolean(String(API_BASE_URL || "").trim());
}

function isLocalRuntime() {
  if (typeof window === "undefined") {
    return false;
  }
  const host = String(window.location.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function canUseRuntimeApi() {
  return hasExplicitApiBase() || isLocalRuntime();
}

function canUsePublicCounter() {
  if (typeof window === "undefined") {
    return false;
  }
  return !canUseRuntimeApi();
}

function sanitizeCounterSegment(value, fallback) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (normalized) {
    return normalized;
  }
  return fallback;
}

function getPublicCounterNamespace() {
  if (typeof window === "undefined") {
    return "polimeter-ghpages";
  }
  const host = sanitizeCounterSegment(window.location.hostname, "polimeter-host");
  return `polimeter-${host}`;
}

function getPublicCounterKey() {
  if (typeof window === "undefined") {
    return `start-count-${QUIZ_VERSION}`;
  }
  const pathToken = sanitizeCounterSegment(window.location.pathname, "root");
  return `start-count-${pathToken}-${QUIZ_VERSION}`;
}

function toStaticUrl(relativePath) {
  const normalized = String(relativePath || "").replace(/^\/+/, "");
  if (typeof window === "undefined") {
    return `./${normalized}`;
  }
  return new URL(`./${normalized}`, window.location.href).toString();
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

function setApiStatus() {
  // در نسخه فعلی نوار وضعیت در UI نمایش داده نمی‌شود.
}

function updateStartCounter(count) {
  if (!dom.attemptCounterBoard) {
    return;
  }

  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const digits = toFaDigits(
    String(safeCount).padStart(COUNTER_DIGITS, "0").slice(-COUNTER_DIGITS),
  );
  dom.attemptCounterBoard.innerHTML = digits
    .split("")
    .map((digit) => `<span class="counter-cell">${digit}</span>`)
    .join("");
}

function toFaDigits(value) {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)]);
}

function formatFaNumber(value) {
  try {
    return new Intl.NumberFormat("fa-IR", {
      useGrouping: false,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  } catch {
    return toFaDigits(String(Number(value) || 0));
  }
}

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getScoreBand(score) {
  if (score < 40) {
    return "low";
  }
  if (score < 80) {
    return "mid";
  }
  return "high";
}

function setScoreCardState(card, score) {
  if (!card) {
    return;
  }

  const clampedScore = clampScore(score);
  const band = getScoreBand(clampedScore);
  // نیم‌دایره از چپ (۰) تا راست (۱۰۰)
  const needleAngle = -180 + clampedScore * 1.8;

  card.style.setProperty("--score-angle", `${needleAngle}deg`);
  card.classList.remove("score-low", "score-mid", "score-high");
  card.classList.add(`score-${band}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function safeDivide(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
}

function getQuestionWeight(question) {
  const raw = Number(question?.weight);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  return raw;
}

function computeSideF1(questions, answerByQuestionId, side) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const question of questions) {
    const weight = getQuestionWeight(question);
    const answer = answerByQuestionId.get(question.id);
    const selectedSide = answer?.selectedSide;

    const isActualSide = question.correct_side === side;
    const isPredictedSide = selectedSide === side;

    if (isActualSide && isPredictedSide) {
      truePositive += weight;
    } else if (!isActualSide && isPredictedSide) {
      falsePositive += weight;
    } else if (isActualSide && !isPredictedSide) {
      falseNegative += weight;
    }
  }

  const precision = safeDivide(truePositive, truePositive + falsePositive);
  const recall = safeDivide(truePositive, truePositive + falseNegative);

  return safeDivide(2 * precision * recall, precision + recall);
}

async function fetchMetricsCountFromFile() {
  const response = await fetch(toStaticUrl("storage/metrics.json"), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`metrics_file_unavailable_${response.status}`);
  }

  const payload = await response.json();
  const startCount = Number(payload?.start_count);
  if (!Number.isFinite(startCount)) {
    throw new Error("invalid_metrics_file_payload");
  }

  return Math.max(0, Math.floor(startCount));
}

async function fetchMetricsCountFromApi() {
  const data = await apiRequest("/api/metrics", { method: "GET" });
  const startCount = Number(data?.start_count);
  if (!Number.isFinite(startCount)) {
    throw new Error("invalid_metric_payload");
  }
  return Math.max(0, Math.floor(startCount));
}

async function fetchMetricsCountFromPublicCounter(mode = "get") {
  const action = mode === "hit" ? "hit" : "get";
  const namespace = getPublicCounterNamespace();
  const key = getPublicCounterKey();
  const endpoint = `${PUBLIC_COUNTER_BASE_URL}/${action}/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`public_counter_request_failed_${response.status}`);
    }
    const payload = await response.json();
    const startCount = Number(payload?.value);
    if (!Number.isFinite(startCount)) {
      throw new Error("invalid_public_counter_payload");
    }
    return Math.max(0, Math.floor(startCount));
  } finally {
    clearTimeout(timeout);
  }
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

function setScreenVisibility(screen, isVisible) {
  if (!screen) {
    return;
  }

  screen.classList.toggle("is-active", isVisible);
  screen.hidden = !isVisible;
}

function setPhase(nextPhase) {
  state.phase = nextPhase;
  if (nextPhase !== QUIZ_STATES.IN_PROGRESS) {
    clearAutoAdvanceTimer();
  }
  if (dom.page) {
    dom.page.classList.toggle(
      "is-quiz-phase",
      nextPhase === QUIZ_STATES.IN_PROGRESS,
    );
  }

  setScreenVisibility(dom.startScreen, nextPhase === QUIZ_STATES.START);
  setScreenVisibility(dom.quizScreen, nextPhase === QUIZ_STATES.IN_PROGRESS);
  setScreenVisibility(dom.resultScreen, nextPhase === QUIZ_STATES.RESULT);

  if (dom.nextAction) {
    dom.nextAction.classList.remove("is-active");
    dom.nextAction.setAttribute("aria-hidden", "true");
  }
}

function clearAutoAdvanceTimer() {
  if (!state.autoAdvanceTimer) {
    return;
  }
  clearTimeout(state.autoAdvanceTimer);
  state.autoAdvanceTimer = null;
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

function findAnswerByQuestionId(questionId) {
  return state.answers.find((entry) => entry.questionId === questionId) || null;
}

function isValidSelectedSide(selectedSide) {
  return selectedSide === "left" || selectedSide === "right" || selectedSide === "neutral";
}

function isAnsweredQuestionAt(index) {
  const question = state.questions[index];
  if (!question) {
    return false;
  }
  return Boolean(findAnswerByQuestionId(question.id));
}

function updateProgressState() {
  const totalQuestions = state.questions.length || QUIZ_SIZE;
  const answeredCount = Math.min(state.answers.length, totalQuestions);
  const progress = percentage(answeredCount, totalQuestions);

  if (dom.progressFill) {
    dom.progressFill.style.width = `${progress}%`;
  }
}

function updateQuizActions() {
  const totalQuestions = state.questions.length || QUIZ_SIZE;
  const isLastQuestion = state.currentIndex >= totalQuestions - 1;
  const isCurrentAnswered = isAnsweredQuestionAt(state.currentIndex);
  const showResultButton = isLastQuestion && isCurrentAnswered;

  if (dom.prevBtn) {
    dom.prevBtn.disabled = state.currentIndex === 0;
  }

  if (dom.nextBtn) {
    dom.nextBtn.textContent = "مشاهده نتیجه";
    dom.nextBtn.disabled = !showResultButton;
  }

  if (dom.nextAction) {
    dom.nextAction.classList.toggle("is-active", showResultButton);
    dom.nextAction.setAttribute("aria-hidden", showResultButton ? "false" : "true");
  }
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) {
    return;
  }

  const questionNumber = state.currentIndex + 1;
  const totalQuestions = state.questions.length || QUIZ_SIZE;
  const selectedAnswer = findAnswerByQuestionId(question.id);
  const axisTitle = String(question.axis_title || "").trim();

  dom.questionIndex.textContent = formatFaNumber(questionNumber);
  dom.questionTotal.textContent = formatFaNumber(totalQuestions);
  if (dom.typeBadge) {
    dom.typeBadge.textContent = axisTitle;
    dom.typeBadge.hidden = !axisTitle;
  }
  dom.questionText.textContent = question.text;

  dom.leftBtn.disabled = false;
  dom.rightBtn.disabled = false;
  if (dom.neutralBtn) {
    dom.neutralBtn.disabled = false;
  }
  dom.leftBtn.classList.toggle("is-selected", selectedAnswer?.selectedSide === "left");
  dom.rightBtn.classList.toggle("is-selected", selectedAnswer?.selectedSide === "right");
  if (dom.neutralBtn) {
    dom.neutralBtn.classList.toggle(
      "is-selected",
      selectedAnswer?.selectedSide === "neutral",
    );
  }

  updateProgressState();
  updateQuizActions();
}

async function registerStartEvent(startedAt) {
  state.startCountLocal += 1;
  writeStartCountLocal(state.startCountLocal);
  updateStartCounter(state.startCountLocal);

  if (canUsePublicCounter()) {
    try {
      const startCount = await fetchMetricsCountFromPublicCounter("hit");
      state.startCountRemote = startCount;
      state.apiAvailable = true;
      updateStartCounter(startCount);
    } catch {
      state.apiAvailable = false;
    }
    return;
  }

  if (!canUseRuntimeApi()) {
    return;
  }

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
      updateStartCounter(startCount);
      if (!state.consentToStoreAnswers) {
        setApiStatus(
          "آزمون شروع شد. چون تیک ذخیره فعال نیست، پاسخ‌ها ذخیره نخواهند شد.",
          "info",
        );
      }
    }
  } catch {
    state.apiAvailable = false;
    if (canUseRuntimeApi()) {
      setApiStatus(
        "ثبت آماری سرور فعلا در دسترس نیست. آزمون بدون اختلال ادامه پیدا می‌کند.",
        "warning",
      );
    }
  }
}

function beginQuiz() {
  clearAutoAdvanceTimer();
  state.consentToStoreAnswers = Boolean(dom.consentCheckbox?.checked);
  state.startedAt = new Date().toISOString();
  state.questions = buildQuizQuestions();
  state.answers = [];
  state.currentIndex = 0;

  setPhase(QUIZ_STATES.IN_PROGRESS);
  renderQuestion();

  if (state.consentToStoreAnswers && canUseRuntimeApi()) {
    setApiStatus(
      "با رضایت شما، پاسخ‌ها پس از پایان آزمون به‌صورت ناشناس ذخیره می‌شود.",
      "info",
    );
  } else if (state.consentToStoreAnswers && !canUseRuntimeApi()) {
    setApiStatus(
      "نسخه فعلی استاتیک است؛ ذخیره پاسخ فقط در صورت اتصال API انجام می‌شود.",
      "warning",
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
  if (!question || !isValidSelectedSide(selectedSide)) {
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

  dom.leftBtn.classList.toggle("is-selected", selectedSide === "left");
  dom.rightBtn.classList.toggle("is-selected", selectedSide === "right");
  if (dom.neutralBtn) {
    dom.neutralBtn.classList.toggle("is-selected", selectedSide === "neutral");
  }
  updateProgressState();
  updateQuizActions();

  if (state.currentIndex >= state.questions.length - 1) {
    return;
  }

  clearAutoAdvanceTimer();
  state.autoAdvanceTimer = setTimeout(() => {
    const currentQuestion = state.questions[state.currentIndex];
    if (currentQuestion?.id === question.id) {
      state.currentIndex += 1;
      renderQuestion();
    }
  }, 170);
}

function nextQuestion() {
  const isLastQuestion = state.currentIndex >= state.questions.length - 1;
  const isCurrentAnswered = isAnsweredQuestionAt(state.currentIndex);

  if (!isLastQuestion || !isCurrentAnswered) {
    return;
  }

  clearAutoAdvanceTimer();
  showResults();
}

function prevQuestion() {
  clearAutoAdvanceTimer();
  if (state.currentIndex <= 0) {
    return;
  }
  state.currentIndex -= 1;
  renderQuestion();
}

function computeMetrics() {
  const totalQuestions = state.questions.length || QUIZ_SIZE;
  const correctCount = state.answers.filter((entry) => entry.isCorrect).length;
  const wrongCount = state.answers.length - correctCount;
  const answerByQuestionId = new Map(
    state.answers.map((answer) => [answer.questionId, answer]),
  );

  let weightedTotal = 0;
  let weightedCorrect = 0;

  const axisMap = new Map();
  for (const question of state.questions) {
    const weight = getQuestionWeight(question);
    const axisId = String(question.axis || "");
    const axisTitle = String(question.axis_title || "").trim()
      || AXIS_LABELS[axisId]
      || "بدون محور";

    if (!axisMap.has(axisId)) {
      axisMap.set(axisId, {
        axisId,
        axisTitle,
        total: 0,
        correct: 0,
        wrong: 0,
        weightedTotal: 0,
        weightedCorrect: 0,
      });
    }

    const axisEntry = axisMap.get(axisId);
    axisEntry.total += 1;
    axisEntry.weightedTotal += weight;
    weightedTotal += weight;

    const answer = answerByQuestionId.get(question.id);
    if (answer?.isCorrect) {
      axisEntry.correct += 1;
      axisEntry.weightedCorrect += weight;
      weightedCorrect += weight;
    } else {
      axisEntry.wrong += 1;
    }
  }

  const leftF1 = computeSideF1(state.questions, answerByQuestionId, "left");
  const rightF1 = computeSideF1(state.questions, answerByQuestionId, "right");

  const axisStats = Array.from(axisMap.values())
    .sort((a, b) => {
      const aIndex = AXES.indexOf(a.axisId);
      const bIndex = AXES.indexOf(b.axisId);
      const safeA = aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (safeA !== safeB) {
        return safeA - safeB;
      }
      return a.axisTitle.localeCompare(b.axisTitle, "fa");
    })
    .map((axisEntry) => ({
      ...axisEntry,
      percent: clampScore(
        safeDivide(axisEntry.weightedCorrect, axisEntry.weightedTotal) * 100,
      ),
    }));

  return {
    totalScore: clampScore(safeDivide(weightedCorrect, weightedTotal) * 100),
    leftScore: clampScore(leftF1 * 100),
    rightScore: clampScore(rightF1 * 100),
    correctCount,
    wrongCount,
    totalQuestions,
    weightedTotal,
    weightedCorrect,
    axisStats,
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
  const answerByQuestionId = new Map(
    state.answers.map((answer) => [answer.questionId, answer]),
  );

  state.questions.forEach((question, index) => {
    const answer = answerByQuestionId.get(question.id);
    if (!answer) {
      return;
    }

    const item = document.createElement("article");
    const itemStateClass = answer.selectedSide === "neutral"
      ? "is-neutral"
      : answer.isCorrect
        ? "is-correct"
        : "is-wrong";
    item.className = `review-item ${itemStateClass}`;

    const head = document.createElement("div");
    head.className = "review-head";

    const title = document.createElement("p");
    title.className = "review-title";
    const axisTitle = String(question.axis_title || "").trim()
      || AXIS_LABELS[question.axis]
      || "محور نامشخص";
    title.textContent = `سوال ${formatFaNumber(index + 1)} · ${axisTitle}`;

    const status = document.createElement("p");
    status.className = "review-status";
    if (answer.selectedSide === "neutral") {
      status.textContent = "نظری ندارم";
    } else {
      status.textContent = answer.isCorrect ? "درست" : "نادرست";
    }

    head.append(title, status);

    const text = document.createElement("p");
    text.className = "review-question";
    text.textContent = question.text;

    const choices = document.createElement("p");
    choices.className = "review-choices";
    const selectedLabel = SIDE_LABELS[answer.selectedSide] || answer.selectedSide;
    const correctLabel = SIDE_LABELS[question.correct_side] || question.correct_side;
    choices.textContent = `پاسخ شما: ${selectedLabel} | پاسخ درست: ${correctLabel}`;

    const explanation = document.createElement("p");
    explanation.className = "review-explanation";
    explanation.textContent = question.explanation;

    item.append(head, text, choices, explanation);

    const correctSummary = String(question.correct_view?.summary || "").trim();
    if (correctSummary) {
      const correctLine = document.createElement("p");
      correctLine.className = "review-view-line";
      correctLine.textContent = `دیدگاه درست (${SIDE_LABELS[question.correct_view.side] || question.correct_view.side}): ${correctSummary}`;
      item.appendChild(correctLine);
    }

    const counterSummary = String(question.counter_view?.summary || "").trim();
    if (counterSummary) {
      const counterLine = document.createElement("p");
      counterLine.className = "review-view-line";
      counterLine.textContent = `دیدگاه مقابل (${SIDE_LABELS[question.counter_view.side] || question.counter_view.side}): ${counterSummary}`;
      item.appendChild(counterLine);
    }

    dom.reviewList.appendChild(item);
  });
}

function renderAxisBreakdown(axisStats) {
  if (!dom.axisBreakdown) {
    return;
  }

  if (!Array.isArray(axisStats) || axisStats.length === 0) {
    dom.axisBreakdown.innerHTML = `
      <p class="axis-empty">داده‌ای برای نمایش عملکرد محورها در دسترس نیست.</p>
    `;
    return;
  }

  dom.axisBreakdown.innerHTML = axisStats
    .map((axisEntry) => {
      const axisTitle = escapeHtml(axisEntry.axisTitle);
      const total = formatFaNumber(axisEntry.total);
      const correct = formatFaNumber(axisEntry.correct);
      const wrong = formatFaNumber(axisEntry.wrong);
      const percent = formatFaNumber(axisEntry.percent);
      return `
        <article class="axis-stat">
          <p class="axis-stat-title">${axisTitle}</p>
          <p class="axis-stat-meta">
            <span>درست ${correct}</span>
            <span>غلط ${wrong}</span>
            <span>از ${total}</span>
            <span>${percent}%</span>
          </p>
        </article>
      `;
    })
    .join("");
}

function buildShareText(metrics) {
  const lines = [
    "نتیجه آزمون پولی‌متر",
    `نمره کل: ${formatFaNumber(metrics.totalScore)} از ۱۰۰`,
    `نمره چپ: ${formatFaNumber(metrics.leftScore)} از ۱۰۰`,
    `نمره راست: ${formatFaNumber(metrics.rightScore)} از ۱۰۰`,
    `پاسخ درست: ${formatFaNumber(metrics.correctCount)} | پاسخ غلط: ${formatFaNumber(metrics.wrongCount)}`,
    "",
    "عملکرد محورها:",
  ];

  for (const axisEntry of metrics.axisStats || []) {
    lines.push(
      `${axisEntry.axisTitle}: ${formatFaNumber(axisEntry.correct)} درست از ${formatFaNumber(axisEntry.total)}`,
    );
  }

  return lines.join("\n");
}

async function shareResults() {
  const metrics = state.lastMetrics;
  if (!metrics) {
    setApiStatus("ابتدا نتیجه آزمون را مشاهده کنید.", "warning");
    return;
  }

  const text = buildShareText(metrics);
  const url = window.location.href;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "نتیجه آزمون پولی‌متر",
        text,
        url,
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setApiStatus("متن نتیجه برای اشتراک‌گذاری در کلیپ‌بورد کپی شد.", "success");
      return;
    } catch {
      // fallback
    }
  }

  setApiStatus(
    "اشتراک‌گذاری خودکار در این مرورگر پشتیبانی نمی‌شود.",
    "warning",
  );
}

async function submitAnswersIfConsented(completedAt) {
  if (!state.consentToStoreAnswers) {
    return;
  }

  if (!canUseRuntimeApi()) {
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
  state.lastMetrics = metrics;

  dom.totalScore.textContent = formatFaNumber(metrics.totalScore);
  dom.leftScore.textContent = formatFaNumber(metrics.leftScore);
  dom.rightScore.textContent = formatFaNumber(metrics.rightScore);
  setScoreCardState(dom.scoreCardTotal, metrics.totalScore);
  setScoreCardState(dom.scoreCardLeft, metrics.leftScore);
  setScoreCardState(dom.scoreCardRight, metrics.rightScore);

  dom.correctCount.textContent = formatFaNumber(metrics.correctCount);
  dom.wrongCount.textContent = formatFaNumber(metrics.wrongCount);
  renderAxisBreakdown(metrics.axisStats);

  setPhase(QUIZ_STATES.RESULT);
  renderReviewList();

  const completedAt = new Date().toISOString();
  void submitAnswersIfConsented(completedAt);
}

function restartQuiz() {
  clearAutoAdvanceTimer();
  state.questions = [];
  state.answers = [];
  state.currentIndex = 0;
  state.consentToStoreAnswers = false;
  state.startedAt = null;
  state.lastMetrics = null;
  if (dom.axisBreakdown) {
    dom.axisBreakdown.innerHTML = "";
  }
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
  updateStartCounter(state.startCountLocal);

  if (canUsePublicCounter()) {
    try {
      const startCount = await fetchMetricsCountFromPublicCounter("get");
      state.startCountRemote = startCount;
      state.apiAvailable = true;
      updateStartCounter(startCount);
      return;
    } catch {
      // اگر شمارنده عمومی در دسترس نبود، fallback محلی/فایل اجرا می‌شود.
    }
  }

  if (hasExplicitApiBase()) {
    try {
      const startCount = await fetchMetricsCountFromApi();
      state.startCountRemote = startCount;
      state.apiAvailable = true;
      updateStartCounter(startCount);
      return;
    } catch {
      // اگر API تنظیم شده ولی پاسخ نداد، به فایل محلی fallback می‌کنیم.
    }
  }

  try {
    const startCount = await fetchMetricsCountFromFile();
    state.startCountRemote = startCount;
    state.apiAvailable = true;
    updateStartCounter(startCount);
    return;
  } catch {
    // در نسخه استاتیک، ممکن است فایل هم در دسترس نباشد.
  }

  if (!canUseRuntimeApi()) {
    setApiStatus(
      "شمارنده فقط به‌صورت محلی در همین مرورگر نمایش داده می‌شود.",
      "info",
    );
    return;
  }

  try {
    const startCount = await fetchMetricsCountFromApi();
    state.startCountRemote = startCount;
    state.apiAvailable = true;
    updateStartCounter(startCount);
    return;
  } catch {
    state.apiAvailable = false;
    setApiStatus(
      "سرویس آمار در دسترس نیست. شمارنده فقط در همین مرورگر نمایش داده می‌شود.",
      "warning",
    );
  }
}

function initialize() {
  setPhase(state.phase);
  void syncCounterOnLoad();

  dom.startBtn.addEventListener("click", beginQuiz);
  dom.leftBtn.addEventListener("click", () => chooseAnswer("left"));
  dom.rightBtn.addEventListener("click", () => chooseAnswer("right"));
  dom.neutralBtn?.addEventListener("click", () => chooseAnswer("neutral"));
  dom.prevBtn.addEventListener("click", prevQuestion);
  dom.nextBtn.addEventListener("click", nextQuestion);
  dom.shareBtn?.addEventListener("click", () => {
    void shareResults();
  });
  dom.restartBtn.addEventListener("click", restartQuiz);

  document.addEventListener("keydown", (event) => {
    if (state.phase !== QUIZ_STATES.IN_PROGRESS) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      chooseAnswer("left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      chooseAnswer("right");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      chooseAnswer("neutral");
    } else if (event.key === "Enter") {
      const isLastQuestion = state.currentIndex >= state.questions.length - 1;
      if (isLastQuestion) {
        event.preventDefault();
        nextQuestion();
      }
    }
  });
}

initialize();
