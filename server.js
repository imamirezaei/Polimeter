import express from "express";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream, existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const MAX_PORT_ATTEMPTS = Number.parseInt(
  process.env.MAX_PORT_ATTEMPTS || "20",
  10,
);
const ADMIN_EXPORT_TOKEN = String(process.env.ADMIN_EXPORT_TOKEN || "").trim();

const CORS_ALLOWED_ORIGIN = String(process.env.CORS_ALLOWED_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const STORAGE_DIR = path.join(ROOT_DIR, "storage");
const METRICS_FILE = path.join(STORAGE_DIR, "metrics.json");
const SUBMISSIONS_FILE = path.join(STORAGE_DIR, "submissions.ndjson");
const ALLOWED_SELECTED_SIDES = new Set(["left", "right", "neutral"]);
const MAX_OPTIONAL_TEXT_LENGTH = 128;
const MAX_RESULT_SUMMARY_CHARS = 20000;

const app = express();

const isIsoTimestamp = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

const isValidQuizVersion = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9._-]{1,32}$/.test(value);

const normalizeOptionalText = (value, maxLength = MAX_OPTIONAL_TEXT_LENGTH) => {
  if (value == null || value === "") {
    return null;
  }

  const text = String(value).trim();
  if (!text || text.length > maxLength) {
    return null;
  }

  return text;
};

const sanitizeStructuredObject = (value, maxChars = MAX_RESULT_SUMMARY_CHARS) => {
  if (value == null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > maxChars) {
      return null;
    }
    return JSON.parse(serialized);
  } catch {
    return null;
  }
};

const isValidAnswerItem = (item) => {
  if (!item || typeof item !== "object") {
    return false;
  }

  const questionId = String(item.question_id || "").trim();
  const selectedSide = String(item.selected_side || "").trim();

  if (!questionId || questionId.length > 32) {
    return false;
  }

  return ALLOWED_SELECTED_SIDES.has(selectedSide);
};

const nowIso = () => new Date().toISOString();

const createSubmissionId = () => {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return randomBytes(16).toString("hex");
};

const defaultMetrics = () => ({
  start_count: 0,
  updated_at: nowIso(),
});

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true });

  if (!existsSync(METRICS_FILE)) {
    await writeFile(METRICS_FILE, `${JSON.stringify(defaultMetrics(), null, 2)}\n`);
  }

  if (!existsSync(SUBMISSIONS_FILE)) {
    await writeFile(SUBMISSIONS_FILE, "");
  }
}

async function readMetrics() {
  await ensureStorage();

  try {
    const raw = await readFile(METRICS_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.start_count === "number" &&
      Number.isFinite(parsed.start_count)
    ) {
      return {
        start_count: Math.max(0, Math.floor(parsed.start_count)),
        updated_at: isIsoTimestamp(parsed.updated_at)
          ? parsed.updated_at
          : nowIso(),
      };
    }

    return defaultMetrics();
  } catch {
    return defaultMetrics();
  }
}

async function writeMetrics(metrics) {
  const payload = {
    start_count: Math.max(0, Math.floor(Number(metrics.start_count) || 0)),
    updated_at: isIsoTimestamp(metrics.updated_at) ? metrics.updated_at : nowIso(),
  };

  await writeFile(METRICS_FILE, `${JSON.stringify(payload, null, 2)}\n`);
}

async function appendSubmission(record) {
  await appendFile(SUBMISSIONS_FILE, `${JSON.stringify(record)}\n`);
}

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  if (CORS_ALLOWED_ORIGIN.length === 0) {
    return true;
  }

  return CORS_ALLOWED_ORIGIN.includes(origin);
};

app.use(express.json({ limit: "120kb" }));

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  const origin = req.headers.origin;
  const allowed = isOriginAllowed(origin);

  if (origin && !allowed) {
    return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  }

  if (origin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-token");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "polimeter-storage-api" });
});

app.get("/api/metrics", async (_req, res) => {
  const metrics = await readMetrics();
  res.json({ ok: true, ...metrics });
});

app.post("/api/metrics/start", async (req, res) => {
  const startedAt = req.body?.started_at;
  const quizVersion = req.body?.quiz_version;

  if (!isIsoTimestamp(startedAt) || !isValidQuizVersion(quizVersion)) {
    return res.status(422).json({
      ok: false,
      error: "payload_invalid",
    });
  }

  const metrics = await readMetrics();
  metrics.start_count += 1;
  metrics.updated_at = nowIso();
  await writeMetrics(metrics);

  return res.json({
    ok: true,
    start_count: metrics.start_count,
  });
});

app.post("/api/submissions", async (req, res) => {
  const consent = req.body?.consent_to_store_answers;
  if (consent !== true) {
    return res.status(400).json({
      ok: false,
      error: "consent_required",
    });
  }

  const quizVersion = req.body?.quiz_version;
  const startedAt = req.body?.started_at;
  const completedAt = req.body?.completed_at;
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : null;

  if (!isValidQuizVersion(quizVersion)) {
    return res.status(422).json({ ok: false, error: "quiz_version_invalid" });
  }

  if (!isIsoTimestamp(startedAt) || !isIsoTimestamp(completedAt)) {
    return res.status(422).json({ ok: false, error: "timestamp_invalid" });
  }

  if (!answers || answers.length === 0 || answers.length > 40) {
    return res.status(422).json({ ok: false, error: "answers_invalid" });
  }

  if (!answers.every(isValidAnswerItem)) {
    return res.status(422).json({ ok: false, error: "answer_item_invalid" });
  }

  const sanitizedAnswers = answers.map((item) => {
    const selectedSide = String(item.selected_side);
    const correctSide = normalizeOptionalText(item.correct_side, 16);
    const derivedIsCorrect = correctSide
      ? selectedSide === correctSide
      : null;

    return {
      question_id: String(item.question_id),
      selected_side: selectedSide,
      correct_side: correctSide,
      is_correct: typeof item.is_correct === "boolean"
        ? item.is_correct
        : derivedIsCorrect,
      question_axis: normalizeOptionalText(item.question_axis, 64),
      question_axis_title: normalizeOptionalText(item.question_axis_title, 128),
    };
  });

  const resultSummary = sanitizeStructuredObject(req.body?.result_summary);

  const record = {
    submission_id: createSubmissionId(),
    quiz_version: quizVersion,
    started_at: startedAt,
    completed_at: completedAt,
    answers: sanitizedAnswers,
    result_summary: resultSummary,
    saved_at: nowIso(),
  };

  await appendSubmission(record);

  return res.json({ ok: true, stored: true });
});

app.get("/api/admin/export", async (req, res) => {
  if (!ADMIN_EXPORT_TOKEN) {
    return res.status(503).json({
      ok: false,
      error: "admin_token_not_configured",
    });
  }

  const token = String(req.headers["x-admin-token"] || "").trim();
  if (!token || token !== ADMIN_EXPORT_TOKEN) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  await ensureStorage();

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (!existsSync(SUBMISSIONS_FILE)) {
    return res.status(200).end("");
  }

  const stream = createReadStream(SUBMISSIONS_FILE, { encoding: "utf8" });
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: "export_read_failed" });
    } else {
      res.end();
    }
  });

  return stream.pipe(res);
});

app.use(express.static(ROOT_DIR));

app.get("*", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function startServer() {
  await ensureStorage();

  let port = PORT;
  const attempts = Number.isFinite(MAX_PORT_ATTEMPTS) && MAX_PORT_ATTEMPTS > 0
    ? MAX_PORT_ATTEMPTS
    : 20;

  for (let index = 0; index < attempts; index += 1) {
    const isAvailable = await isPortAvailable(port);
    if (isAvailable) {
      app.listen(port, () => {
        console.log(`Polimeter API+static listening on http://localhost:${port}`);
      });
      return;
    }

    console.warn(`port ${port} is busy, trying ${port + 1}...`);
    port += 1;
  }

  throw new Error(
    `No free port found in range ${PORT}-${PORT + attempts - 1}. Set PORT manually and retry.`,
  );
}

startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
