const DEFAULT_ALLOWED_ORIGIN = "https://imamirezaei.github.io";
const COUNTER_KEY = "quiz_starts_total";
const START_METRIC_PATH = "/api/metrics/start";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePathname(url.pathname);
    const method = request.method.toUpperCase();
    const allowedOrigin = String(env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN).trim();
    const requestOrigin = request.headers.get("Origin");

    if (pathname !== START_METRIC_PATH) {
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
        return handleUnhandledError(error, allowedOrigin, requestOrigin);
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
        return handleUnhandledError(error, allowedOrigin, requestOrigin);
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
  },
};

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
  if (!eventId) {
    return false;
  }
  if (eventId.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9:_-]+$/.test(eventId);
}

function buildCorsHeaders(allowedOrigin, requestOrigin) {
  const headers = new Headers();
  headers.set("Vary", "Origin");

  if (requestOrigin && requestOrigin === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
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

function handleUnhandledError(error, allowedOrigin, requestOrigin) {
  console.error("[metrics-start] unexpected_error", error);
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
