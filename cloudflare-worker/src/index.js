const DEFAULT_ALLOWED_ORIGIN = "https://imamirezaei.github.io";
const COUNTER_KEY = "quiz_starts_total";
const START_METRIC_PATH = "/api/metrics/start";
const SUBMISSIONS_PATH = "/api/submissions";
const ALLOWED_SIDES = new Set(["left", "right", "neutral"]);
const MAX_EVENT_ID_LENGTH = 128;
const MAX_QUIZ_VERSION_LENGTH = 32;
const MAX_QUESTION_ID_LENGTH = 64;
const MAX_ANSWERS_PER_SUBMISSION = 100;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePathname(url.pathname);
    const method = request.method.toUpperCase();
    const allowedOrigin = String(env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN).trim();
    const requestOrigin = request.headers.get("Origin");

    if (!isSupportedPath(pathname)) {
      return jsonResponse(
        { ok: false, error: "not_found" },
        {
          status: 404,
          allowedOrigin,
          requestOrigin,
        },
      );
    }

    if (requestOrigin && requestOrigin !== allowedOrigin) {
      return jsonResponse(
        { ok: false, error: "origin_not_allowed" },
        {
          status: 403,
          allowedOrigin,
          requestOrigin,
        },
      );
    }

    if (method === "OPTIONS") {
      return jsonResponse(
        { ok: true },
        {
          status: 200,
          allowedOrigin,
          requestOrigin,
        },
      );
    }

    if (pathname === START_METRIC_PATH) {
      return handleStartMetricsRoute(request, env, {
        method,
        allowedOrigin,
        requestOrigin,
      });
    }

    if (pathname === SUBMISSIONS_PATH) {
      return handleSubmissionsRoute(request, env, {
        method,
        allowedOrigin,
        requestOrigin,
      });
    }

    return jsonResponse(
      { ok: false, error: "not_found" },
      {
        status: 404,
        allowedOrigin,
        requestOrigin,
      },
    );
  },
};

function isSupportedPath(pathname) {
  return pathname === START_METRIC_PATH || pathname === SUBMISSIONS_PATH;
}

async function handleStartMetricsRoute(request, env, context) {
  const { method, allowedOrigin, requestOrigin } = context;

  if (method === "GET") {
    try {
      const metric = await getStartCounter(env.DB);
      return jsonResponse(
        {
          ok: true,
          key: COUNTER_KEY,
          count: metric.count,
          updatedAt: metric.updatedAt,
        },
        {
          status: 200,
          allowedOrigin,
          requestOrigin,
        },
      );
    } catch (error) {
      return handleUnhandledError("metrics_start_get_failed", error, allowedOrigin, requestOrigin);
    }
  }

  if (method === "POST") {
    try {
      const payload = await readJsonBody(request);
      const eventId = String(payload?.eventId || "").trim();
      if (!isValidEventId(eventId)) {
        return jsonResponse(
          { ok: false, error: "invalid_event_id" },
          {
            status: 400,
            allowedOrigin,
            requestOrigin,
          },
        );
      }

      const result = await registerStartEvent(env.DB, eventId);
      return jsonResponse(
        {
          ok: true,
          key: COUNTER_KEY,
          count: result.count,
          updatedAt: result.updatedAt,
          incremented: result.incremented,
          duplicate: !result.incremented,
        },
        {
          status: 200,
          allowedOrigin,
          requestOrigin,
        },
      );
    } catch (error) {
      if (error instanceof InvalidJsonError) {
        return jsonResponse(
          { ok: false, error: "invalid_json_body" },
          {
            status: 400,
            allowedOrigin,
            requestOrigin,
          },
        );
      }
      return handleUnhandledError("metrics_start_post_failed", error, allowedOrigin, requestOrigin);
    }
  }

  return jsonResponse(
    { ok: false, error: "method_not_allowed" },
    {
      status: 405,
      allowedOrigin,
      requestOrigin,
    },
  );
}

async function handleSubmissionsRoute(request, env, context) {
  const { method, allowedOrigin, requestOrigin } = context;

  if (method !== "POST") {
    return jsonResponse(
      { ok: false, error: "method_not_allowed" },
      {
        status: 405,
        allowedOrigin,
        requestOrigin,
      },
    );
  }

  try {
    const payload = await readJsonBody(request);
    const normalizedPayload = normalizeSubmissionPayload(payload);
    const persisted = await storeSubmission(env.DB, normalizedPayload);

    return jsonResponse(
      {
        ok: true,
        submissionId: persisted.submissionId,
        storedAnswers: persisted.storedAnswers,
        createdAt: persisted.createdAt,
      },
      {
        status: 201,
        allowedOrigin,
        requestOrigin,
      },
    );
  } catch (error) {
    if (error instanceof InvalidJsonError) {
      return jsonResponse(
        { ok: false, error: "invalid_json_body" },
        {
          status: 400,
          allowedOrigin,
          requestOrigin,
        },
      );
    }
    if (error instanceof ValidationError) {
      return jsonResponse(
        { ok: false, error: error.code },
        {
          status: 400,
          allowedOrigin,
          requestOrigin,
        },
      );
    }
    return handleUnhandledError("submissions_post_failed", error, allowedOrigin, requestOrigin);
  }
}

async function getStartCounter(db) {
  const nowIso = new Date().toISOString();
  const [ensureCounterResult, selectCounterResult] = await db.batch([
    db.prepare(
      `INSERT INTO metrics_counters ("key", value, updated_at)
       VALUES (?, 0, ?)
       ON CONFLICT("key") DO NOTHING`,
    ).bind(COUNTER_KEY, nowIso),
    db.prepare(
      `SELECT value, updated_at
       FROM metrics_counters
       WHERE "key" = ?`,
    ).bind(COUNTER_KEY),
  ]);

  if (!ensureCounterResult?.success || !selectCounterResult?.success) {
    throw new Error("db_read_failed");
  }

  const row = selectCounterResult.results?.[0];
  if (!row) {
    return { count: 0, updatedAt: nowIso };
  }

  return {
    count: normalizeCounterValue(row.value),
    updatedAt: String(row.updated_at || nowIso),
  };
}

async function registerStartEvent(db, eventId) {
  const nowIso = new Date().toISOString();

  // `changes()` in the UPDATE statement reads the row-change count from the
  // immediately previous INSERT (the event insert), so duplicates increment by 0.
  const [ensureCounterResult, insertEventResult, updateCounterResult, selectCounterResult] =
    await db.batch([
      db.prepare(
        `INSERT INTO metrics_counters ("key", value, updated_at)
         VALUES (?, 0, ?)
         ON CONFLICT("key") DO NOTHING`,
      ).bind(COUNTER_KEY, nowIso),
      db.prepare(
        `INSERT INTO metrics_events (event_id, created_at)
         VALUES (?, ?)
         ON CONFLICT(event_id) DO NOTHING`,
      ).bind(eventId, nowIso),
      db.prepare(
        `UPDATE metrics_counters
         SET value = value + changes(),
             updated_at = CASE
               WHEN changes() > 0 THEN ?
               ELSE updated_at
             END
         WHERE "key" = ?`,
      ).bind(nowIso, COUNTER_KEY),
      db.prepare(
        `SELECT value, updated_at
         FROM metrics_counters
         WHERE "key" = ?`,
      ).bind(COUNTER_KEY),
    ]);

  if (
    !ensureCounterResult?.success ||
    !insertEventResult?.success ||
    !updateCounterResult?.success ||
    !selectCounterResult?.success
  ) {
    throw new Error("db_write_failed");
  }

  const row = selectCounterResult.results?.[0];
  const incremented = Number(insertEventResult?.meta?.changes || 0) > 0;

  return {
    count: normalizeCounterValue(row?.value),
    updatedAt: String(row?.updated_at || nowIso),
    incremented,
  };
}

function normalizeSubmissionPayload(payload) {
  if (payload?.consent_to_store_answers !== true) {
    throw new ValidationError("consent_required");
  }

  const quizVersion = normalizeText(payload?.quiz_version, MAX_QUIZ_VERSION_LENGTH);
  if (!quizVersion) {
    throw new ValidationError("invalid_quiz_version");
  }

  const startedAt = normalizeTimestampOrNull(payload?.started_at, "invalid_started_at");
  const completedAt = normalizeTimestampOrNull(payload?.completed_at, "invalid_completed_at");

  if (!Array.isArray(payload?.answers)) {
    throw new ValidationError("invalid_answers");
  }
  if (payload.answers.length === 0) {
    throw new ValidationError("empty_answers");
  }
  if (payload.answers.length > MAX_ANSWERS_PER_SUBMISSION) {
    throw new ValidationError("too_many_answers");
  }

  const answers = [];
  const questionIdSet = new Set();
  for (const entry of payload.answers) {
    const questionId = normalizeText(entry?.question_id, MAX_QUESTION_ID_LENGTH);
    if (!questionId) {
      throw new ValidationError("invalid_question_id");
    }
    if (questionIdSet.has(questionId)) {
      throw new ValidationError("duplicate_question_id");
    }

    const selectedSide = String(entry?.selected_side || "").trim();
    if (!ALLOWED_SIDES.has(selectedSide)) {
      throw new ValidationError("invalid_selected_side");
    }

    questionIdSet.add(questionId);
    answers.push({
      questionId,
      selectedSide,
    });
  }

  return {
    quizVersion,
    startedAt,
    completedAt,
    answers,
  };
}

async function storeSubmission(db, payload) {
  const submissionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const statements = [
    db.prepare(
      `INSERT INTO quiz_submissions (
         submission_id,
         quiz_version,
         started_at,
         completed_at,
         answers_count,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      submissionId,
      payload.quizVersion,
      payload.startedAt,
      payload.completedAt,
      payload.answers.length,
      createdAt,
    ),
  ];

  for (const answer of payload.answers) {
    statements.push(
      db.prepare(
        `INSERT INTO quiz_submission_answers (
           submission_id,
           question_id,
           selected_side,
           created_at
         ) VALUES (?, ?, ?, ?)`,
      ).bind(submissionId, answer.questionId, answer.selectedSide, createdAt),
    );
  }

  const results = await db.batch(statements);
  if (results.some((entry) => !entry?.success)) {
    throw new Error("db_write_failed");
  }

  return {
    submissionId,
    storedAnswers: payload.answers.length,
    createdAt,
  };
}

function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function normalizeCounterValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.floor(numeric));
}

function isValidEventId(eventId) {
  if (!eventId || eventId.length > MAX_EVENT_ID_LENGTH) {
    return false;
  }
  return /^[a-zA-Z0-9:_-]+$/.test(eventId);
}

function normalizeText(value, maxLength) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength) {
    return "";
  }
  return text;
}

function normalizeTimestampOrNull(value, errorCode) {
  if (value == null || value === "") {
    return null;
  }
  const text = String(value).trim();
  if (text.length > 40 || Number.isNaN(Date.parse(text))) {
    throw new ValidationError(errorCode);
  }
  return text;
}

function buildCorsHeaders(allowedOrigin, requestOrigin) {
  const headers = new Headers();
  headers.set("Vary", "Origin");

  if (requestOrigin && requestOrigin === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Cache-Control");
    headers.set("Access-Control-Max-Age", "86400");
  }

  return headers;
}

function jsonResponse(payload, { status = 200, allowedOrigin, requestOrigin } = {}) {
  const headers = buildCorsHeaders(allowedOrigin, requestOrigin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  if (status === 405) {
    headers.set("Allow", "GET,POST,OPTIONS");
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

function handleUnhandledError(scope, error, allowedOrigin, requestOrigin) {
  console.error(`[worker] ${scope}`, error);
  return jsonResponse(
    { ok: false, error: "internal_error" },
    {
      status: 500,
      allowedOrigin,
      requestOrigin,
    },
  );
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonError();
  }
}

class InvalidJsonError extends Error {}

class ValidationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
