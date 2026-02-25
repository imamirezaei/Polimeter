import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QUESTIONS from "../data/questions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.resolve(__dirname, "../report/questions-audit.json");
const QUIZ_SIZE = 20;
const AXES = [
  "economic",
  "domestic_policy",
  "foreign_policy",
  "historical",
  "national_security",
];
const AXIS_FALLBACK_KEY = "__unassigned__";

const EXPECTED = {
  total: 40,
  domain: { conceptual: 20, historical: 20 },
  type: { concept: 14, statement: 13, definition: 13 },
  side: { left: 20, right: 20 },
  difficulty: { easy: 20, medium: 20 },
  eras: {
    constitutional: 4,
    "oil-nationalization": 4,
    "post-1979": 4,
    "reconstruction-privatization": 4,
    "reform-civic": 4,
  },
};

const MIN_TOKENS_BY_TYPE = {
  concept: 8,
  statement: 8,
  definition: 7,
};

const TRADEOFF_PATTERNS = [
  /چه\s+پیامد/i,
  /چه\s+شرط/i,
  /در\s+چه\s+صورت/i,
  /به\s*شرط/i,
  /هزینه/i,
  /فایده/i,
  /تعادل/i,
  /حتی\s+با/i,
  /از\s+مسیر/i,
  /وابسته/i,
  /اولویت/i,
  /تاکید/i,
  /فقط/i,
  /بدون/i,
  /نقش/i,
  /کاهش.*افزایش|افزایش.*کاهش/i,
  /مگر/i,
  /اگر/i,
];

const CUE_TOKENS = new Set([
  "رقابت",
  "مالکیت",
  "بازار",
  "نابرابری",
  "قرارداد",
  "دولت",
  "مالیات",
  "حمایت",
  "رفاه",
  "مقررات",
  "بازتوزیع",
  "دستمزد",
  "قیمت",
  "خدمات",
  "آزادی",
  "اتحادیه",
]);

const STOPWORDS = new Set([
  "و",
  "یا",
  "در",
  "با",
  "به",
  "از",
  "که",
  "را",
  "این",
  "آن",
  "برای",
  "تا",
  "است",
  "شود",
  "می",
  "میشود",
  "می‌شود",
  "کند",
  "کند؟",
  "شود؟",
  "تر",
  "تر؟",
  "یک",
  "اگر",
  "حتی",
  "هم",
  "اما",
  "در",
  "پس",
  "سال",
  "های",
  "های",
]);

function normalizeText(text) {
  return String(text)
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/[()\[\]{}.,:;!?"'«»]/g, " ")
    .replace(/[0-9۰-۹]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length > 1)
    .filter((token) => !STOPWORDS.has(token));
}

function bump(counter, key) {
  counter[key] = (counter[key] || 0) + 1;
}

function checkExpectedCounts(questions, failures) {
  const counts = {
    total: questions.length,
    domain: { conceptual: 0, historical: 0 },
    axis: {
      economic: 0,
      domestic_policy: 0,
      foreign_policy: 0,
      historical: 0,
      national_security: 0,
      unassigned: 0,
    },
    type: { concept: 0, statement: 0, definition: 0 },
    side: { left: 0, right: 0 },
    difficulty: { easy: 0, medium: 0 },
    eras: {
      constitutional: 0,
      "oil-nationalization": 0,
      "post-1979": 0,
      "reconstruction-privatization": 0,
      "reform-civic": 0,
    },
  };

  for (const question of questions) {
    bump(counts.domain, question.domain);
    if (AXES.includes(question.axis)) {
      bump(counts.axis, question.axis);
    } else {
      bump(counts.axis, "unassigned");
    }
    bump(counts.type, question.type);
    bump(counts.side, question.correct_side);
    bump(counts.difficulty, question.difficulty);
    if (question.domain === "historical") {
      bump(counts.eras, question.era);
    }
  }

  if (counts.total !== EXPECTED.total) {
    failures.push(
      `total mismatch: expected=${EXPECTED.total} actual=${counts.total}`,
    );
  }

  for (const group of ["domain", "type", "side", "difficulty", "eras"]) {
    for (const [key, expectedValue] of Object.entries(EXPECTED[group])) {
      const actual = counts[group][key] || 0;
      if (actual !== expectedValue) {
        failures.push(
          `${group}.${key} mismatch: expected=${expectedValue} actual=${actual}`,
        );
      }
    }
  }

  // اگر محور برای کل سوال‌ها پر شده باشد، توازن محور هم سخت‌گیرانه بررسی می‌شود.
  if (counts.axis.unassigned === 0 && questions.length > 0) {
    const expectedPerAxis = Math.floor(questions.length / AXES.length);
    const isEven = questions.length % AXES.length === 0;
    if (isEven) {
      for (const axis of AXES) {
        const actual = counts.axis[axis] || 0;
        if (actual !== expectedPerAxis) {
          failures.push(
            `axis.${axis} mismatch: expected=${expectedPerAxis} actual=${actual}`,
          );
        }
      }
    }
  }

  return counts;
}

function buildAxisTargets(totalQuestions) {
  const targets = Object.fromEntries(AXES.map((axis) => [axis, 0]));
  if (totalQuestions <= 0) {
    return targets;
  }

  if (totalQuestions < AXES.length) {
    const order = [...AXES].sort(() => Math.random() - 0.5);
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

  [...AXES]
    .sort(() => Math.random() - 0.5)
    .slice(0, remainder)
    .forEach((axis) => {
      targets[axis] += 1;
    });

  return targets;
}

function simulateSelectionAxisCounts(questions, quizSize = QUIZ_SIZE) {
  const pools = new Map();
  AXES.forEach((axis) => pools.set(axis, []));
  pools.set(AXIS_FALLBACK_KEY, []);

  for (const question of questions) {
    if (AXES.includes(question.axis)) {
      pools.get(question.axis).push(question);
    } else {
      pools.get(AXIS_FALLBACK_KEY).push(question);
    }
  }

  for (const [key, list] of pools.entries()) {
    pools.set(key, [...list].sort(() => Math.random() - 0.5));
  }

  const targets = buildAxisTargets(quizSize);
  const selectedAxis = Object.fromEntries(AXES.map((axis) => [axis, 0]));
  selectedAxis.unassigned = 0;
  let shortage = 0;

  for (const axis of AXES) {
    const pool = pools.get(axis) || [];
    const target = targets[axis] || 0;
    const take = Math.min(target, pool.length);
    selectedAxis[axis] += take;
    pool.splice(0, take);
    if (take < target) {
      shortage += target - take;
    }
  }

  while (shortage > 0) {
    const candidates = AXES.filter((axis) => (pools.get(axis) || []).length > 0);
    if (!candidates.length) {
      break;
    }
    const chosen = candidates.sort((a, b) => selectedAxis[a] - selectedAxis[b])[0];
    const item = pools.get(chosen).shift();
    if (!item) {
      break;
    }
    selectedAxis[chosen] += 1;
    shortage -= 1;
  }

  if (shortage > 0) {
    const fallbackPool = pools.get(AXIS_FALLBACK_KEY) || [];
    const take = Math.min(shortage, fallbackPool.length);
    selectedAxis.unassigned += take;
  }

  return selectedAxis;
}

function checkQuestionForm(questions, failures, warnings) {
  const tooShort = [];
  let tradeoffHits = 0;
  let mediumTradeoffHits = 0;
  let mediumCount = 0;

  for (const question of questions) {
    const tokens = tokenize(question.text);
    const minTokens = MIN_TOKENS_BY_TYPE[question.type] || 8;

    if (tokens.length < 2) {
      failures.push(`single-word-like question detected: ${question.id}`);
    }

    if (tokens.length < minTokens) {
      tooShort.push({ id: question.id, type: question.type, tokenCount: tokens.length, minTokens });
    }

    const hasTradeoff = TRADEOFF_PATTERNS.some((pattern) => pattern.test(question.text));
    if (hasTradeoff) {
      tradeoffHits += 1;
      if (question.difficulty === "medium") {
        mediumTradeoffHits += 1;
      }
    }

    if (question.difficulty === "medium") {
      mediumCount += 1;
    }
  }

  if (tooShort.length) {
    warnings.push({ kind: "short_questions", items: tooShort });
  }

  const tradeoffRate = questions.length ? tradeoffHits / questions.length : 0;
  const mediumTradeoffRate = mediumCount ? mediumTradeoffHits / mediumCount : 0;

  if (tradeoffRate < 0.45) {
    failures.push(`tradeoff coverage too low: rate=${tradeoffRate.toFixed(2)} expected>=0.45`);
  }

  if (mediumTradeoffRate < 0.55) {
    failures.push(
      `medium tradeoff coverage too low: rate=${mediumTradeoffRate.toFixed(2)} expected>=0.55`,
    );
  }

  return {
    tradeoffHits,
    tradeoffRate,
    mediumTradeoffHits,
    mediumTradeoffRate,
  };
}

function computeLexicalBias(questions, failures) {
  const sideTokenCounts = {
    left: Object.create(null),
    right: Object.create(null),
  };

  for (const question of questions) {
    const tokens = tokenize(question.text);
    for (const token of tokens) {
      if (!CUE_TOKENS.has(token)) {
        continue;
      }
      bump(sideTokenCounts[question.correct_side], token);
    }
  }

  const vocab = new Set([
    ...Object.keys(sideTokenCounts.left),
    ...Object.keys(sideTokenCounts.right),
  ]);

  const flagged = [];

  for (const token of vocab) {
    const left = sideTokenCounts.left[token] || 0;
    const right = sideTokenCounts.right[token] || 0;
    const total = left + right;
    if (total < 4) {
      continue;
    }

    const smoothedLeft = left + 0.5;
    const smoothedRight = right + 0.5;
    const log2odds = Math.log2(smoothedLeft / smoothedRight);

    if (Math.abs(log2odds) > 2) {
      flagged.push({ token, total, left, right, log2odds: Number(log2odds.toFixed(3)) });
    }
  }

  if (flagged.length > 0) {
    failures.push(
      `lexical bias detected: ${flagged.length} token(s) with freq>=4 and |log2-odds|>2`,
    );
  }

  return flagged.sort((a, b) => Math.abs(b.log2odds) - Math.abs(a.log2odds));
}

function runAudit() {
  const failures = [];
  const warnings = [];

  const counts = checkExpectedCounts(QUESTIONS, failures);
  const selectedAxis = simulateSelectionAxisCounts(QUESTIONS, QUIZ_SIZE);
  const formStats = checkQuestionForm(QUESTIONS, failures, warnings);
  const lexicalFlags = computeLexicalBias(QUESTIONS, failures);

  if (counts.axis.unassigned > 0) {
    warnings.push({
      kind: "axis_unassigned",
      message:
        "محور بعضی سوال‌ها هنوز مقداردهی نشده است. بعد از تکمیل axis، توازن محور را دوباره چک کنید.",
      unassigned_count: counts.axis.unassigned,
    });
  }

  const result = {
    ok: failures.length === 0,
    checked_at: new Date().toISOString(),
    summary: {
      total_questions: QUESTIONS.length,
      counts: {
        ...counts,
        selected_axis: selectedAxis,
      },
      form: formStats,
      lexical_flags_count: lexicalFlags.length,
    },
    lexical_flags: lexicalFlags,
    warnings,
    failures,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2), "utf8");

  console.log(`\n[questions:audit] report written to ${REPORT_PATH}`);
  console.log(`[questions:audit] status: ${result.ok ? "PASS" : "FAIL"}`);

  if (result.lexical_flags.length) {
    console.log("[questions:audit] lexical flags:");
    for (const item of result.lexical_flags) {
      console.log(
        `  - ${item.token}: total=${item.total}, left=${item.left}, right=${item.right}, log2odds=${item.log2odds}`,
      );
    }
  }

  if (result.failures.length) {
    console.log("[questions:audit] failures:");
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

runAudit();
