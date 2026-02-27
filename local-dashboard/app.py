#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import json
import os
import sqlite3
import subprocess
import webbrowser
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
BACKUPS_DIR = PROJECT_ROOT / "backups"
QUESTIONS_PATH = PROJECT_ROOT / "data/questions.js"
OUTPUT_DIR = ROOT / "outputs"
CSV_DIR = OUTPUT_DIR / "csv"
DB_PATH = OUTPUT_DIR / "polimeter.sqlite"
INDEX_PATH = ROOT / "index.html"
STYLE_PATH = ROOT / "style.css"
JS_PATH = ROOT / "dashboard.js"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5177
ANSWERERS_BACKUP_GLOB = "polimeter-answerers-*.sql"
METRICS_SNAPSHOT_GLOB = "polimeter-metrics-*.json"
DEFAULT_COUNTER_API_URL = "https://polimeter-counter-api.imamirezaei-polimeter.workers.dev/api/metrics/start"
PENALTY_DIVISOR = 3.0
SIDE_LABELS = {
    "left": "چپ",
    "right": "راست",
    "neutral": "خنثی",
}
AXIS_ORDER = [
    "economic",
    "domestic_policy",
    "foreign_policy",
    "historical",
    "national_security",
]
AXIS_ORDER_INDEX = {axis_id: index for index, axis_id in enumerate(AXIS_ORDER)}

STYLE_CSS = """\
:root {
  color-scheme: dark;
  --bg-1: #0b1630;
  --bg-2: #122449;
  --hero-glow-1: rgba(87, 129, 255, 0.15);
  --hero-glow-2: rgba(9, 18, 39, 0.36);
  --panel: rgba(13, 24, 47, 0.76);
  --surface: rgba(16, 31, 61, 0.78);
  --surface-soft: rgba(20, 37, 73, 0.72);
  --border: rgba(132, 166, 221, 0.22);
  --border-strong: rgba(200, 166, 73, 0.46);
  --text: #e8f0ff;
  --muted: #c3d1ea;
  --soft: #94abd1;
  --accent: #5f86ff;
  --accent-2: #7ea2ff;
  --accent-soft: rgba(95, 134, 255, 0.18);
  --warning: #f4cc56;
  --shadow: 0 24px 44px rgba(1, 7, 20, 0.45);
  --shadow-md: 0 14px 28px rgba(1, 7, 20, 0.35);
  --focus-ring: rgba(95, 134, 255, 0.35);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Vazirmatn", Tahoma, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 15% 12%, var(--hero-glow-1), transparent 38%),
    radial-gradient(circle at 85% 24%, var(--hero-glow-2), transparent 40%),
    linear-gradient(168deg, var(--bg-1), var(--bg-2));
  color: var(--text);
  direction: rtl;
}

.container {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 54px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--panel);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
}

.hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.55rem);
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.hero p {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.85;
}

.meta {
  min-width: min(360px, 100%);
  display: grid;
  gap: 10px;
  text-align: left;
  color: var(--soft);
  font-size: 14px;
}

.meta > div {
  padding: 12px 14px;
  border: 1px solid rgba(138, 170, 224, 0.16);
  border-radius: 14px;
  background: rgba(20, 36, 69, 0.3);
}

.section {
  background: var(--panel);
  border: 1px solid var(--border);
  backdrop-filter: blur(10px);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 22px;
  margin-bottom: 18px;
}

.section h2 {
  margin: 0 0 14px;
  font-size: 22px;
  color: var(--text);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-note {
  color: var(--soft);
  font-size: 13px;
}

.small-note,
.footer-note {
  color: var(--soft);
  font-size: 13px;
}

.footer-note {
  text-align: center;
  margin-top: 8px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.kpi-card {
  background:
    radial-gradient(circle at 30% 0%, rgba(95, 134, 255, 0.16), transparent 46%),
    linear-gradient(180deg, rgba(28, 53, 101, 0.92), rgba(13, 31, 69, 0.92));
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-md);
}

.kpi-label {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 10px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--warning);
}

.metric-inline {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 16px;
}

.metric-inline strong {
  font-size: 26px;
  color: var(--warning);
}

.metric-inline span {
  color: var(--soft);
}

.bar-list {
  display: grid;
  gap: 10px;
}

.bar-row {
  display: grid;
  grid-template-columns: 112px 1fr 88px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.bar-label,
.bar-value {
  color: var(--muted);
  white-space: nowrap;
}

.bar-track {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(147, 179, 232, 0.12);
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.table-wrap {
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  background: transparent;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(147, 179, 232, 0.16);
  text-align: right;
  font-size: 14px;
}

th {
  position: sticky;
  top: 0;
  background: rgba(16, 31, 61, 0.98);
  color: var(--muted);
  font-weight: 700;
  z-index: 1;
}

th.sortable {
  cursor: pointer;
}

th[data-active="asc"],
th[data-active="desc"] {
  color: var(--warning);
}

th.sortable::after {
  content: "↕";
  font-size: 11px;
  margin-inline-start: 6px;
  color: var(--soft);
}

tbody tr:hover {
  background: rgba(95, 134, 255, 0.08);
}

.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.controls input {
  min-width: 280px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  color: var(--text);
  background: rgba(12, 25, 53, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.controls input::placeholder {
  color: var(--soft);
}

.controls input:focus,
.question-view-btn:focus,
.question-modal-close:focus {
  outline: none;
  border-color: var(--accent-2);
  box-shadow: 0 0 0 4px var(--focus-ring);
}

code {
  direction: ltr;
  unicode-bidi: embed;
  background: rgba(95, 134, 255, 0.12);
  color: var(--text);
  border-radius: 6px;
  padding: 2px 6px;
}

.empty-state {
  color: var(--soft);
  padding: 16px;
}

.question-view-btn {
  border: 1px solid var(--border);
  background: rgba(12, 25, 53, 0.92);
  color: var(--text);
  border-radius: 10px;
  padding: 7px 12px;
  font: inherit;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.question-view-btn:hover {
  background: rgba(95, 134, 255, 0.14);
  border-color: var(--accent-2);
  transform: translateY(-1px);
}

.question-view-btn:disabled {
  cursor: not-allowed;
  color: rgba(195, 209, 234, 0.46);
  background: rgba(20, 37, 73, 0.5);
}

.question-modal[hidden] {
  display: none;
}

.question-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.question-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(5, 10, 22, 0.72);
}

.question-modal-card {
  position: relative;
  width: min(720px, calc(100% - 24px));
  margin: 48px auto;
  background: rgba(13, 24, 47, 0.96);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: 0 24px 70px rgba(1, 7, 20, 0.48);
  padding: 18px;
}

.question-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.question-modal-head h3 {
  margin: 0;
  font-size: 22px;
}

.question-modal-close {
  border: 1px solid var(--border);
  background: rgba(12, 25, 53, 0.92);
  color: var(--text);
  border-radius: 10px;
  padding: 7px 12px;
  font: inherit;
  cursor: pointer;
}

.question-modal-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.question-answer-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 13px;
  color: var(--accent-2);
  background: var(--accent-soft);
}

.question-modal-text {
  margin: 0;
  line-height: 1.95;
  font-size: 16px;
  color: var(--muted);
}

@media (max-width: 960px) {
  .hero {
    flex-direction: column;
  }

  .meta {
    min-width: 100%;
    text-align: right;
  }
}

@media (max-width: 720px) {
  .container {
    width: min(100% - 20px, 1200px);
  }

  .section {
    padding: 16px;
    border-radius: 16px;
  }

  .kpi-value {
    font-size: 24px;
  }

  .bar-row {
    grid-template-columns: 92px 1fr 76px;
  }

  .controls input {
    min-width: 0;
    width: 100%;
  }
}
"""

DASHBOARD_JS = """\
(() => {
  const table = document.getElementById('question-quality-table');
  const modal = document.getElementById('question-modal');
  const modalQuestionId = document.getElementById('modal-question-id');
  const modalQuestionText = document.getElementById('modal-question-text');
  const modalCorrectAnswer = document.getElementById('modal-correct-answer');
  const modalClose = document.getElementById('question-modal-close');
  const modalBackdrop = modal?.querySelector('.question-modal-backdrop');

  function openQuestionModal(button) {
    if (!modal) {
      return;
    }

    modalQuestionId.textContent = button.dataset.questionId || '-';
    modalQuestionText.textContent = button.dataset.questionText || 'متن سوال پیدا نشد.';
    modalCorrectAnswer.textContent = `پاسخ درست: ${button.dataset.correctSide || '-'}`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeQuestionModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.question-view-btn').forEach((button) => {
    button.addEventListener('click', () => openQuestionModal(button));
  });

  modalClose?.addEventListener('click', closeQuestionModal);
  modalBackdrop?.addEventListener('click', closeQuestionModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeQuestionModal();
    }
  });

  if (table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = Array.from(table.querySelectorAll('th.sortable'));
    const searchInput = document.getElementById('question-search');
    const countEl = document.getElementById('question-count');

    let sortKey = 'views';
    let sortDir = 'desc';
    let searchTerm = '';

    function cellFor(row, key) {
      return row.querySelector(`[data-key-col="${key}"]`);
    }

    function compareValues(a, b, type) {
      if (type === 'number') {
        return Number(a) - Number(b);
      }
      return String(a).localeCompare(String(b), 'fa');
    }

    function render() {
      const visible = rows.filter((row) => row.dataset.search.includes(searchTerm));
      const activeHeader = headers.find((header) => header.dataset.key === sortKey);
      const sortType = activeHeader?.dataset.type || 'string';

      visible.sort((rowA, rowB) => {
        const valueA = cellFor(rowA, sortKey)?.dataset.value ?? '';
        const valueB = cellFor(rowB, sortKey)?.dataset.value ?? '';
        const delta = compareValues(valueA, valueB, sortType);
        return sortDir === 'asc' ? delta : -delta;
      });

      tbody.innerHTML = '';
      visible.forEach((row) => tbody.appendChild(row));
      headers.forEach((header) => {
        const isActive = header.dataset.key === sortKey;
        header.dataset.active = isActive ? sortDir : '';
      });

      if (countEl) {
        countEl.textContent = `${visible.length} سوال`;
      }
    }

    searchInput?.addEventListener('input', (event) => {
      searchTerm = event.target.value.trim().toLowerCase();
      render();
    });

    headers.forEach((header) => {
      header.addEventListener('click', () => {
        if (sortKey === header.dataset.key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = header.dataset.key;
          sortDir = header.dataset.defaultDir || 'desc';
        }
        render();
      });
    });

    render();
  }
})();
"""

QUERY_MAP = {
    "session_overview": """
        SELECT
          COUNT(*) AS stored_participants,
          ROUND(AVG(answers_count), 2) AS avg_answers_count
        FROM dashboard_sessions;
    """,
    "score_overview": """
        SELECT
          COUNT(*) AS scored_participants,
          ROUND(AVG(total_score_percent), 2) AS overall_accuracy_percent,
          ROUND(AVG(left_score_percent), 2) AS left_accuracy_percent,
          ROUND(AVG(right_score_percent), 2) AS right_accuracy_percent
        FROM dashboard_answerer_scores;
    """,
    "session_durations": """
        SELECT
          answerer_id,
          ((julianday(completed_at) - julianday(started_at)) * 86400.0) AS duration_seconds
        FROM dashboard_sessions
        WHERE started_at IS NOT NULL AND started_at <> ''
          AND completed_at IS NOT NULL AND completed_at <> '';
    """,
    "alignment_summary": """
        SELECT
          side,
          COUNT(*) AS participant_count,
          ROUND(AVG(total_questions), 2) AS avg_total_questions,
          ROUND(AVG(correct_count), 2) AS avg_correct_count,
          ROUND(AVG(wrong_count), 2) AS avg_wrong_count,
          ROUND(AVG(neutral_count), 2) AS avg_neutral_count,
          ROUND(AVG(penalty_count), 2) AS avg_penalty_count,
          ROUND(AVG(effective_correct_count), 2) AS avg_effective_correct_count,
          ROUND(AVG(score_percent), 2) AS avg_score_percent
        FROM dashboard_side_scores
        GROUP BY side
        ORDER BY CASE side WHEN 'left' THEN 1 WHEN 'right' THEN 2 ELSE 3 END;
    """,
    "axis_summary": f"""
        WITH grouped AS (
          SELECT
            answerer_id,
            question_axis,
            question_axis_title,
            correct_side AS side,
            COUNT(*) AS total_answers,
            SUM(question_weight) AS weighted_total,
            SUM(CASE WHEN selected_side = 'neutral' THEN 1 ELSE 0 END) AS neutral_count,
            SUM(CASE WHEN selected_side <> 'neutral' AND is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
            SUM(CASE WHEN selected_side <> 'neutral' AND is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count,
            SUM(CASE WHEN selected_side <> 'neutral' AND is_correct = 1 THEN question_weight ELSE 0 END) AS weighted_correct
          FROM dashboard_answers_enriched
          WHERE correct_side IN ('left', 'right')
          GROUP BY answerer_id, question_axis, question_axis_title, correct_side
        ),
        scored AS (
          SELECT
            answerer_id,
            question_axis,
            question_axis_title,
            side,
            total_answers,
            weighted_total,
            neutral_count,
            correct_count,
            wrong_count,
            weighted_correct,
            (CAST(wrong_count AS REAL) / {PENALTY_DIVISOR}) AS penalty_count,
            CASE
              WHEN total_answers > 0 THEN weighted_total / total_answers
              ELSE 0.0
            END AS average_weight
          FROM grouped
        )
        SELECT
          question_axis,
          question_axis_title,
          SUM(total_answers) AS total_answers,
          ROUND(
            100.0 * SUM(
              MAX(0.0, weighted_correct - MIN(weighted_correct, penalty_count * average_weight))
            ) / SUM(weighted_total),
            2
          ) AS accuracy_percent,
          ROUND(100.0 * SUM(neutral_count) / SUM(total_answers), 2) AS neutral_percent
        FROM scored
        GROUP BY question_axis, question_axis_title
        ORDER BY total_answers DESC, question_axis_title ASC;
    """,
    "question_quality": """
        SELECT
          question_id,
          question_axis,
          question_axis_title,
          COUNT(*) AS views,
          ROUND(100.0 * AVG(is_correct), 2) AS accuracy_percent,
          ROUND(100.0 * SUM(CASE WHEN selected_side = 'left' THEN 1 ELSE 0 END) / COUNT(*), 2) AS left_percent,
          ROUND(100.0 * SUM(CASE WHEN selected_side = 'right' THEN 1 ELSE 0 END) / COUNT(*), 2) AS right_percent,
          ROUND(100.0 * SUM(CASE WHEN selected_side = 'neutral' THEN 1 ELSE 0 END) / COUNT(*), 2) AS neutral_percent
        FROM dashboard_answers_enriched
        GROUP BY question_id, question_axis, question_axis_title
        ORDER BY views DESC, question_id ASC;
    """,
}


def ensure_directories() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CSV_DIR.mkdir(parents=True, exist_ok=True)


def clear_csv_exports() -> None:
    for csv_path in CSV_DIR.glob("*.csv"):
        csv_path.unlink()


def write_static_assets() -> None:
    STYLE_PATH.write_text(STYLE_CSS, encoding="utf-8")
    JS_PATH.write_text(DASHBOARD_JS, encoding="utf-8")


def resolve_latest_backup_path(pattern: str, env_var_name: str, *, required: bool) -> Path | None:
    override = str(os.environ.get(env_var_name, "")).strip()
    if override:
        path = Path(override).expanduser()
        if not path.is_absolute():
            path = (PROJECT_ROOT / path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"مسیر داده‌شده در {env_var_name} پیدا نشد: {path}")
        return path

    candidates = sorted(BACKUPS_DIR.glob(pattern))
    if not candidates:
        if required:
            raise FileNotFoundError(f"هیچ فایلی با الگوی {pattern} در {BACKUPS_DIR} پیدا نشد.")
        return None
    return candidates[-1]


def load_question_bank() -> tuple[dict[str, dict[str, object]], list[str]]:
    if not QUESTIONS_PATH.exists():
        return {}, [f"فایل بانک سوال پیدا نشد: {QUESTIONS_PATH}"]

    script = f"""
import questions from {json.dumps(QUESTIONS_PATH.as_uri())};
const result = questions.map((question) => ({{
  id: question.id,
  text: question.text,
  correct_side: question.correct_side,
  weight: question.weight,
  axis: question.axis,
  axis_title: question.axis_title,
}}));
process.stdout.write(JSON.stringify(result));
"""

    try:
        completed = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            check=True,
            capture_output=True,
            text=True,
        )
        raw_rows = json.loads(completed.stdout)
    except FileNotFoundError:
        return {}, ["Node.js برای خواندن data/questions.js در دسترس نیست."]
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        message = stderr.splitlines()[-1] if stderr else str(exc)
        return {}, [f"خواندن questions.js شکست خورد: {message}"]
    except json.JSONDecodeError as exc:
        return {}, [f"خروجی parser سوال‌ها JSON معتبر نبود: {exc}"]

    question_bank: dict[str, dict[str, object]] = {}
    for row in raw_rows:
        question_id = str(row.get("id") or "").strip()
        if not question_id:
            continue
        weight = row.get("weight")
        try:
            normalized_weight = float(weight)
        except (TypeError, ValueError):
            normalized_weight = 1.0
        question_bank[question_id] = {
            "id": question_id,
            "text": str(row.get("text") or "").strip(),
            "correct_side": str(row.get("correct_side") or "").strip(),
            "weight": normalized_weight if normalized_weight > 0 else 1.0,
            "axis": str(row.get("axis") or "").strip(),
            "axis_title": str(row.get("axis_title") or "").strip(),
        }

    return question_bank, []


def read_metrics_snapshot(snapshot_path: Path | None) -> tuple[dict[str, object] | None, list[str]]:
    if snapshot_path is None:
        return None, ["snapshot شمارنده شرکت‌کنندگان هنوز در backups موجود نیست."]

    try:
        raw = json.loads(snapshot_path.read_text(encoding="utf-8"))
    except OSError as exc:
        return None, [f"خواندن snapshot شمارنده شکست خورد: {exc}"]
    except json.JSONDecodeError as exc:
        return None, [f"فایل snapshot شمارنده JSON معتبر نیست: {exc}"]

    try:
        value = int(float(raw.get("value", 0)))
    except (TypeError, ValueError):
        value = 0

    payload = {
        "key": str(raw.get("key") or "quiz_starts_total"),
        "value": max(0, value),
        "updated_at": str(raw.get("updated_at") or "").strip(),
        "fetched_at": str(raw.get("fetched_at") or "").strip(),
        "path": snapshot_path,
    }
    warnings: list[str] = []
    if not payload["updated_at"]:
        warnings.append("snapshot شمارنده فاقد updated_at است.")
    return payload, warnings


def fetch_live_metrics_counter() -> tuple[dict[str, object] | None, list[str]]:
    api_url = str(os.environ.get("POLIMETER_COUNTER_API_URL", DEFAULT_COUNTER_API_URL)).strip()
    if not api_url:
        return None, []

    try:
        completed = subprocess.run(
            ["curl", "-m", "15", "-fsS", "-H", "Accept: application/json", api_url],
            check=True,
            capture_output=True,
            text=True,
        )
        payload = json.loads(completed.stdout)
    except (FileNotFoundError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        return None, [f"live counter fetch failed, snapshot fallback used: {exc}"]

    try:
        value = int(float(payload.get("count", 0)))
    except (TypeError, ValueError):
        value = 0

    return (
        {
            "key": str(payload.get("key") or "quiz_starts_total"),
            "value": max(0, value),
            "updated_at": str(payload.get("updatedAt") or "").strip(),
            "fetched_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "source": "live_api",
        },
        [],
    )


def create_database_from_dump(dump_path: Path) -> sqlite3.Connection:
    if not dump_path.exists():
        raise FileNotFoundError(f"SQL dump پیدا نشد: {dump_path}")

    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(dump_path.read_text(encoding="utf-8"))
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
        (name,),
    ).fetchone()
    return bool(row)


def register_question_bank(conn: sqlite3.Connection, question_bank: dict[str, dict[str, object]]) -> None:
    conn.execute("DROP TABLE IF EXISTS dashboard_questions")
    conn.execute(
        """
        CREATE TEMP TABLE dashboard_questions (
          question_id TEXT PRIMARY KEY,
          question_text TEXT,
          correct_side TEXT,
          question_weight REAL NOT NULL,
          question_axis TEXT,
          question_axis_title TEXT
        )
        """
    )
    conn.executemany(
        """
        INSERT INTO dashboard_questions (
          question_id,
          question_text,
          correct_side,
          question_weight,
          question_axis,
          question_axis_title
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            (
                question_id,
                str(question.get("text") or ""),
                str(question.get("correct_side") or ""),
                float(question.get("weight") or 1.0),
                str(question.get("axis") or ""),
                str(question.get("axis_title") or ""),
            )
            for question_id, question in question_bank.items()
        ],
    )


def create_dashboard_views(conn: sqlite3.Connection) -> list[str]:
    warnings: list[str] = []
    conn.executescript(
        """
        DROP VIEW IF EXISTS dashboard_sessions;
        DROP VIEW IF EXISTS dashboard_answers;
        DROP VIEW IF EXISTS dashboard_answers_enriched;
        DROP VIEW IF EXISTS dashboard_side_scores;
        DROP VIEW IF EXISTS dashboard_answerer_scores;
        """
    )

    has_sessions = table_exists(conn, "answerer_sessions")
    has_answers = table_exists(conn, "answerer_answers")
    has_submissions = table_exists(conn, "answerer_submissions")

    if has_sessions and has_answers:
        conn.executescript(
            """
            CREATE TEMP VIEW dashboard_sessions AS
            SELECT
              answerer_id,
              quiz_version,
              started_at,
              completed_at,
              answers_count,
              created_at
            FROM answerer_sessions;

            CREATE TEMP VIEW dashboard_answers AS
            SELECT
              answerer_id,
              question_id,
              selected_side,
              correct_side,
              is_correct,
              question_axis,
              question_axis_title,
              created_at
            FROM answerer_answers;
            """
        )
    elif has_submissions:
        warnings.append("dump از schema جدید answerer_submissions خوانده شد و به جدول‌های موقت تحلیلی تبدیل شد.")
        conn.executescript(
            """
            CREATE TEMP VIEW dashboard_sessions AS
            SELECT
              answerer_id,
              COALESCE(NULLIF(json_extract(submission_json, '$.quiz_version'), ''), 'unknown') AS quiz_version,
              NULLIF(json_extract(submission_json, '$.started_at'), '') AS started_at,
              NULLIF(json_extract(submission_json, '$.completed_at'), '') AS completed_at,
              COALESCE(json_array_length(json_extract(submission_json, '$.answers')), 0) AS answers_count,
              created_at
            FROM answerer_submissions;

            CREATE TEMP VIEW dashboard_answers AS
            SELECT
              s.answerer_id,
              NULLIF(json_extract(answer.value, '$.question_id'), '') AS question_id,
              COALESCE(NULLIF(json_extract(answer.value, '$.selected_side'), ''), 'neutral') AS selected_side,
              NULLIF(json_extract(answer.value, '$.correct_side'), '') AS correct_side,
              CASE
                WHEN CAST(COALESCE(json_extract(answer.value, '$.is_correct'), 0) AS INTEGER) <> 0 THEN 1
                ELSE 0
              END AS is_correct,
              NULLIF(json_extract(answer.value, '$.question_axis'), '') AS question_axis,
              NULLIF(json_extract(answer.value, '$.question_axis_title'), '') AS question_axis_title,
              s.created_at AS created_at
            FROM answerer_submissions s
            JOIN json_each(s.submission_json, '$.answers') AS answer
            WHERE NULLIF(json_extract(answer.value, '$.question_id'), '') IS NOT NULL;
            """
        )
    else:
        raise RuntimeError("هیچ‌کدام از جدول‌های answerer_sessions/answerer_answers یا answerer_submissions در dump وجود ندارد.")

    conn.executescript(
        f"""
        CREATE TEMP VIEW dashboard_answers_enriched AS
        SELECT
          a.answerer_id,
          a.question_id,
          COALESCE(NULLIF(a.selected_side, ''), 'neutral') AS selected_side,
          COALESCE(NULLIF(a.correct_side, ''), q.correct_side, 'unknown') AS correct_side,
          CASE
            WHEN COALESCE(NULLIF(a.selected_side, ''), 'neutral') = 'neutral' THEN 0
            WHEN COALESCE(NULLIF(a.correct_side, ''), q.correct_side, '') <> '' THEN
              CASE
                WHEN COALESCE(NULLIF(a.selected_side, ''), 'neutral') = COALESCE(NULLIF(a.correct_side, ''), q.correct_side) THEN 1
                ELSE 0
              END
            ELSE
              CASE WHEN CAST(COALESCE(a.is_correct, 0) AS INTEGER) <> 0 THEN 1 ELSE 0 END
          END AS is_correct,
          COALESCE(NULLIF(a.question_axis, ''), q.question_axis, 'unknown') AS question_axis,
          COALESCE(NULLIF(a.question_axis_title, ''), q.question_axis_title, 'نامشخص') AS question_axis_title,
          COALESCE(q.question_weight, 1.0) AS question_weight,
          a.created_at
        FROM dashboard_answers a
        LEFT JOIN dashboard_questions q
          ON q.question_id = a.question_id
        WHERE a.question_id IS NOT NULL;

        CREATE TEMP VIEW dashboard_side_scores AS
        WITH grouped AS (
          SELECT
            answerer_id,
            correct_side AS side,
            COUNT(*) AS total_questions,
            SUM(question_weight) AS weighted_total,
            SUM(CASE WHEN selected_side = 'neutral' THEN 1 ELSE 0 END) AS neutral_count,
            SUM(CASE WHEN selected_side <> 'neutral' AND is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
            SUM(CASE WHEN selected_side <> 'neutral' AND is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count,
            SUM(CASE WHEN selected_side <> 'neutral' AND is_correct = 1 THEN question_weight ELSE 0 END) AS weighted_correct
          FROM dashboard_answers_enriched
          WHERE correct_side IN ('left', 'right')
          GROUP BY answerer_id, correct_side
        ),
        scored AS (
          SELECT
            answerer_id,
            side,
            total_questions,
            weighted_total,
            neutral_count,
            correct_count,
            wrong_count,
            weighted_correct,
            (CAST(wrong_count AS REAL) / {PENALTY_DIVISOR}) AS penalty_count,
            CASE
              WHEN total_questions > 0 THEN weighted_total / total_questions
              ELSE 0.0
            END AS average_weight
          FROM grouped
        )
        SELECT
          answerer_id,
          side,
          total_questions,
          weighted_total,
          neutral_count,
          correct_count,
          wrong_count,
          weighted_correct,
          penalty_count,
          average_weight,
          MIN(weighted_correct, penalty_count * average_weight) AS weighted_penalty,
          MAX(0.0, weighted_correct - MIN(weighted_correct, penalty_count * average_weight)) AS weighted_effective_correct,
          MAX(0.0, correct_count - penalty_count) AS effective_correct_count,
          CASE
            WHEN weighted_total > 0 THEN ROUND(100.0 * weighted_correct / weighted_total, 2)
            ELSE NULL
          END AS raw_score_percent,
          CASE
            WHEN weighted_total > 0 THEN ROUND(
              100.0 * MAX(0.0, weighted_correct - MIN(weighted_correct, penalty_count * average_weight)) / weighted_total,
              2
            )
            ELSE NULL
          END AS score_percent
        FROM scored;

        CREATE TEMP VIEW dashboard_answerer_scores AS
        WITH side_pivot AS (
          SELECT
            answerer_id,
            MAX(CASE WHEN side = 'left' THEN score_percent END) AS left_score_percent,
            MAX(CASE WHEN side = 'right' THEN score_percent END) AS right_score_percent
          FROM dashboard_side_scores
          GROUP BY answerer_id
        ),
        totals AS (
          SELECT
            answerer_id,
            SUM(total_questions) AS total_questions,
            SUM(correct_count) AS correct_count,
            SUM(wrong_count) AS wrong_count,
            SUM(neutral_count) AS neutral_count,
            SUM(penalty_count) AS penalty_count,
            SUM(effective_correct_count) AS effective_correct_count,
            SUM(weighted_total) AS weighted_total,
            SUM(weighted_correct) AS weighted_correct,
            SUM(weighted_effective_correct) AS weighted_effective_correct
          FROM dashboard_side_scores
          GROUP BY answerer_id
        )
        SELECT
          t.answerer_id,
          t.total_questions,
          t.correct_count,
          t.wrong_count,
          t.neutral_count,
          t.penalty_count,
          t.effective_correct_count,
          CASE
            WHEN t.weighted_total > 0 THEN ROUND(100.0 * t.weighted_correct / t.weighted_total, 2)
            ELSE NULL
          END AS raw_total_score_percent,
          CASE
            WHEN t.weighted_total > 0 THEN ROUND(100.0 * t.weighted_effective_correct / t.weighted_total, 2)
            ELSE NULL
          END AS total_score_percent,
          COALESCE(p.left_score_percent, 0) AS left_score_percent,
          COALESCE(p.right_score_percent, 0) AS right_score_percent
        FROM totals t
        LEFT JOIN side_pivot p
          ON p.answerer_id = t.answerer_id;
        """
    )
    return warnings


def query_rows(conn: sqlite3.Connection, sql: str) -> list[sqlite3.Row]:
    return list(conn.execute(sql).fetchall())


def export_csv(name: str, rows: list[sqlite3.Row]) -> None:
    path = CSV_DIR / f"{name}.csv"
    if not rows:
        path.write_text("", encoding="utf-8-sig")
        return

    fieldnames = rows[0].keys()
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in fieldnames})


def load_and_export_queries(conn: sqlite3.Connection) -> dict[str, list[sqlite3.Row]]:
    clear_csv_exports()
    results: dict[str, list[sqlite3.Row]] = {}
    for name, sql in QUERY_MAP.items():
        rows = query_rows(conn, sql)
        results[name] = rows
        export_csv(name, rows)
    return results


def escape(value: object) -> str:
    return html.escape("" if value is None else str(value))


def fmt_int(value: object) -> str:
    try:
        return f"{int(float(value)):,}"
    except (TypeError, ValueError):
        return "-"


def fmt_float(value: object, digits: int = 2) -> str:
    try:
        return f"{float(value):,.{digits}f}"
    except (TypeError, ValueError):
        return "-"


def fmt_percent(value: object) -> str:
    return f"{fmt_float(value, 2)}٪"


def side_label(side: object) -> str:
    return SIDE_LABELS.get(str(side or "").strip(), str(side or "-"))


def fmt_seconds_to_clock(seconds: float | None) -> str:
    if seconds is None:
        return "-"
    total_seconds = max(int(round(seconds)), 0)
    minutes, sec = divmod(total_seconds, 60)
    return f"{minutes}:{sec:02d}"


def table_html(rows: Iterable[dict[str, object] | sqlite3.Row], columns: list[tuple[str, str]]) -> str:
    row_list = list(rows)
    if not row_list:
        return '<div class="empty-state">داده‌ای برای نمایش وجود ندارد.</div>'

    thead = "".join(f"<th>{escape(label)}</th>" for label, _ in columns)
    body_rows = []
    for row in row_list:
        body_cells = [f"<td>{escape(row[key])}</td>" for _, key in columns]
        body_rows.append(f"<tr>{''.join(body_cells)}</tr>")
    return (
        "<div class=\"table-wrap\"><table><thead><tr>"
        f"{thead}</tr></thead><tbody>{''.join(body_rows)}</tbody></table></div>"
    )


def question_lookup_button(question_id: object, question_bank: dict[str, dict[str, object]]) -> str:
    question_id_str = str(question_id or "").strip()
    question = question_bank.get(question_id_str)
    if not question:
        return '<button type="button" class="question-view-btn" disabled>ناموجود</button>'

    question_text = html.escape(str(question.get("text") or ""), quote=True)
    correct_side = html.escape(side_label(question.get("correct_side")), quote=True)
    question_id_attr = html.escape(question_id_str, quote=True)
    return (
        '<button type="button" class="question-view-btn" '
        f'data-question-id="{question_id_attr}" '
        f'data-question-text="{question_text}" '
        f'data-correct-side="{correct_side}">مشاهده</button>'
    )


def render_question_modal() -> str:
    return """
    <div id="question-modal" class="question-modal" hidden>
      <div class="question-modal-backdrop"></div>
      <div class="question-modal-card" role="dialog" aria-modal="true" aria-labelledby="question-modal-title">
        <div class="question-modal-head">
          <h3 id="question-modal-title">جزئیات سوال</h3>
          <button type="button" class="question-modal-close" id="question-modal-close">بستن</button>
        </div>
        <div class="question-modal-meta">
          <code id="modal-question-id">-</code>
          <span class="question-answer-pill" id="modal-correct-answer">پاسخ درست: -</span>
        </div>
        <p class="question-modal-text" id="modal-question-text">-</p>
      </div>
    </div>
    """


def build_duration_buckets(duration_rows: list[sqlite3.Row]) -> tuple[list[dict[str, object]], float | None, int]:
    buckets = [0] * 16
    clean_durations: list[float] = []
    skipped_negative = 0
    for row in duration_rows:
        try:
            value = float(row["duration_seconds"])
        except (TypeError, ValueError):
            continue
        if value < 0:
            skipped_negative += 1
            continue
        clean_durations.append(value)
        minute_bucket = int(value // 60)
        if minute_bucket >= 15:
            minute_bucket = 15
        buckets[minute_bucket] += 1

    labels = [f"{i}-{i + 1} دقیقه" for i in range(15)] + ["15+ دقیقه"]
    rows = []
    total = len(clean_durations) or 1
    for label, count in zip(labels, buckets):
        rows.append(
            {
                "label": label,
                "count": count,
                "percent": round(100.0 * count / total, 2),
            }
        )
    average = sum(clean_durations) / len(clean_durations) if clean_durations else None
    return rows, average, skipped_negative


def bar_list_html(rows: list[dict[str, object]], label_key: str, value_key: str) -> str:
    if not rows:
        return '<div class="empty-state">داده‌ای برای نمایش وجود ندارد.</div>'

    max_value = max(float(row[value_key]) for row in rows) or 1
    chunks = []
    for row in rows:
        value = float(row[value_key])
        width = max(3.0, 100.0 * value / max_value) if value > 0 else 0
        chunks.append(
            f'''<div class="bar-row">
              <div class="bar-label">{escape(row[label_key])}</div>
              <div class="bar-track"><div class="bar-fill" style="width:{width:.2f}%"></div></div>
              <div class="bar-value">{fmt_int(value)}</div>
            </div>'''
        )
    return f'<div class="bar-list">{"".join(chunks)}</div>'


def render_question_quality(rows: list[sqlite3.Row], question_bank: dict[str, dict[str, object]]) -> str:
    if not rows:
        return '<div class="empty-state">هیچ داده‌ای برای کیفیت سوال‌ها وجود ندارد.</div>'

    header_specs = [
        ("سوال", "question_id", "string", "asc"),
        ("محور", "question_axis_title", "string", "asc"),
        ("بازدید", "views", "number", "desc"),
        ("دقت", "accuracy_percent", "number", "desc"),
        ("چپ", "left_percent", "number", "desc"),
        ("راست", "right_percent", "number", "desc"),
        ("خنثی", "neutral_percent", "number", "desc"),
    ]

    header_html = []
    for label, key, value_type, default_dir in header_specs:
        header_html.append(
            f'<th class="sortable" data-key="{key}" data-type="{value_type}" data-default-dir="{default_dir}">{escape(label)}</th>'
        )

    body_html = []
    for row in rows:
        question_id = str(row["question_id"])
        question = question_bank.get(question_id, {})
        search_blob = " ".join(
            [
                question_id,
                str(row["question_axis"] or ""),
                str(row["question_axis_title"] or ""),
                str(question.get("text") or ""),
            ]
        ).lower()
        body_html.append(
            f'''<tr data-search="{escape(search_blob)}">
                <td data-key-col="question_id" data-value="{escape(question_id)}"><code>{escape(question_id)}</code></td>
                <td data-key-col="question_axis_title" data-value="{escape(row['question_axis_title'])}">{escape(row['question_axis_title'])}</td>
                <td data-key-col="views" data-value="{int(row['views'])}">{fmt_int(row['views'])}</td>
                <td data-key-col="accuracy_percent" data-value="{row['accuracy_percent']}">{fmt_percent(row['accuracy_percent'])}</td>
                <td data-key-col="left_percent" data-value="{row['left_percent']}">{fmt_percent(row['left_percent'])}</td>
                <td data-key-col="right_percent" data-value="{row['right_percent']}">{fmt_percent(row['right_percent'])}</td>
                <td data-key-col="neutral_percent" data-value="{row['neutral_percent']}">{fmt_percent(row['neutral_percent'])}</td>
                <td data-key-col="view_button" data-value="{escape(question_id)}">{question_lookup_button(question_id, question_bank)}</td>
            </tr>'''
        )

    return f'''
      <div class="controls">
        <input id="question-search" type="search" placeholder="جست‌وجو بر اساس کد سوال یا محور..." />
        <span class="section-note" id="question-count">{len(rows)} سوال</span>
      </div>
      <div class="table-wrap" style="margin-top:14px;">
        <table id="question-quality-table">
          <thead><tr>{''.join(header_html)}<th>مشاهده</th></tr></thead>
          <tbody>{''.join(body_html)}</tbody>
        </table>
      </div>
    '''


def sort_axis_rows(rows: list[sqlite3.Row]) -> list[sqlite3.Row]:
    return sorted(
        rows,
        key=lambda row: (
            AXIS_ORDER_INDEX.get(str(row["question_axis"]), len(AXIS_ORDER_INDEX) + 1),
            str(row["question_axis_title"]),
        ),
    )


def build_dashboard_html(
    results: dict[str, list[sqlite3.Row]],
    question_bank: dict[str, dict[str, object]],
    warnings: list[str],
    generated_at: str,
    answerers_dump_path: Path,
    metrics_snapshot: dict[str, object] | None,
) -> str:
    session_overview = results["session_overview"][0]
    score_overview = results["score_overview"][0]
    stored_participants = int(session_overview["stored_participants"] or 0)
    scored_participants = int(score_overview["scored_participants"] or 0)
    participants_total = None if metrics_snapshot is None else int(metrics_snapshot["value"] or 0)
    save_rate = None
    if participants_total and participants_total > 0:
        save_rate = round(100.0 * stored_participants / participants_total, 2)

    durations, average_duration, skipped_negative = build_duration_buckets(results["session_durations"])

    alignment_rows = [
        {
            "side_title": side_label(row["side"]),
            "participant_count": fmt_int(row["participant_count"]),
            "avg_total_questions": fmt_float(row["avg_total_questions"]),
            "avg_correct_count": fmt_float(row["avg_correct_count"]),
            "avg_wrong_count": fmt_float(row["avg_wrong_count"]),
            "avg_neutral_count": fmt_float(row["avg_neutral_count"]),
            "avg_penalty_count": fmt_float(row["avg_penalty_count"]),
            "avg_effective_correct_count": fmt_float(row["avg_effective_correct_count"]),
            "avg_score_percent": fmt_percent(row["avg_score_percent"]),
        }
        for row in results["alignment_summary"]
    ]
    alignment_table = table_html(
        alignment_rows,
        [
            ("گرایش", "side_title"),
            ("شرکت‌کننده", "participant_count"),
            ("میانگین سوال", "avg_total_questions"),
            ("میانگین درست", "avg_correct_count"),
            ("میانگین غلط", "avg_wrong_count"),
            ("میانگین خنثی", "avg_neutral_count"),
            ("میانگین جریمه", "avg_penalty_count"),
            ("میانگین درست موثر", "avg_effective_correct_count"),
            ("دقت با نمره منفی", "avg_score_percent"),
        ],
    )

    axis_rows = [
        {
            "question_axis_title": row["question_axis_title"],
            "question_axis": row["question_axis"],
            "total_answers": fmt_int(row["total_answers"]),
            "accuracy_percent": fmt_percent(row["accuracy_percent"]),
            "neutral_percent": fmt_percent(row["neutral_percent"]),
        }
        for row in sort_axis_rows(results["axis_summary"])
    ]
    axis_table = table_html(
        axis_rows,
        [
            ("محور", "question_axis_title"),
            ("کد محور", "question_axis"),
            ("کل پاسخ", "total_answers"),
            ("دقت با نمره منفی", "accuracy_percent"),
            ("خنثی", "neutral_percent"),
        ],
    )

    extra_warnings = list(warnings)
    if skipped_negative:
        extra_warnings.append(f"{skipped_negative} مدت زمان منفی از توزیع زمان حذف شد.")
    if stored_participants != scored_participants:
        extra_warnings.append(
            f"{stored_participants - scored_participants} رکورد ذخیره‌شده در محاسبه امتیاز قابل استفاده نبود."
        )

    warning_html = ""
    if extra_warnings:
        warning_html = "<div class=\"section\"><h2>هشدارها</h2><ul>" + "".join(
            f"<li class=\"small-note\">{escape(item)}</li>" for item in extra_warnings
        ) + "</ul></div>"

    metrics_meta_html = "<div>counter source: snapshot unavailable</div>"
    if metrics_snapshot is not None:
        snapshot_updated = str(metrics_snapshot.get("updated_at") or "-")
        source_label = "Cloudflare API" if metrics_snapshot.get("source") == "live_api" else "snapshot"
        metrics_meta_html = f"<div>Counter sync: {escape(source_label)} · {escape(snapshot_updated)}</div>"

    return f'''<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>داشبورد داده‌های پولیمتر</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800&display=swap"
    rel="stylesheet"
  />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="container">
    <header class="hero">
      <div>
        <h1>داشبورد داده‌های پولیمتر</h1>
        <p>این صفحه از آخرین بک‌آپ پاسخ‌ها و snapshot شمارنده Cloudflare ساخته می‌شود و دقت‌ها با منطق نمره منفی جدید محاسبه شده‌اند.</p>
      </div>
      <div class="meta">
        <div>آخرین ساخت داشبورد: {escape(generated_at)}</div>
        <div>آخرین بک‌آپ پاسخ‌ها: {escape(answerers_dump_path.name)}</div>
        {metrics_meta_html}
      </div>
    </header>

    <section class="section">
      <h2>شاخص‌های کلیدی</h2>
      <div class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-label">کل شرکت‌کنندگان</div>
          <div class="kpi-value">{fmt_int(participants_total)}</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">کل ذخیره‌شده‌ها</div>
          <div class="kpi-value">{fmt_int(stored_participants)}</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">نرخ ذخیره</div>
          <div class="kpi-value">{fmt_percent(save_rate)}</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">دقت کل</div>
          <div class="kpi-value">{fmt_percent(score_overview['overall_accuracy_percent'])}</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">دقت گرایش چپ</div>
          <div class="kpi-value">{fmt_percent(score_overview['left_accuracy_percent'])}</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-label">دقت گرایش راست</div>
          <div class="kpi-value">{fmt_percent(score_overview['right_accuracy_percent'])}</div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>توزیع زمان پاسخ‌گویی</h2>
        <span class="section-note">هیستوگرام دقیقه‌ای تا 15+ دقیقه</span>
      </div>
      <div class="metric-inline">
        <strong>{fmt_seconds_to_clock(average_duration)}</strong>
        <span>میانگین مدت جلسه</span>
      </div>
      {bar_list_html(durations, 'label', 'count')}
    </section>

    <section class="section">
      <h2>خلاصه گرایش‌ها</h2>
      <p class="small-note">این جدول میانگین امتیاز ذخیره‌شده شرکت‌کنندگان را به تفکیک گرایش و با اعمال نمره منفی نشان می‌دهد.</p>
      {alignment_table}
    </section>

    <section class="section">
      <h2>خلاصه محورها</h2>
      <p class="small-note">خلاصه محورها بر اساس داده‌های ذخیره‌شده نمایش داده می‌شود و دقت هر محور با اعمال نمره منفی در باکت‌های چپ/راست و سهم پاسخ خنثی محاسبه شده است.</p>
      {axis_table}
    </section>

    <section class="section">
      <div class="section-head">
        <h2>کیفیت سوال‌ها</h2>
        <span class="section-note">جست‌وجو و sort در مرورگر، بدون کتابخانه خارجی</span>
      </div>
      {render_question_quality(results['question_quality'], question_bank)}
    </section>

    {warning_html}

    <footer class="footer-note">
      این داشبورد فقط آمار تجمیعی و ناشناس را نمایش می‌دهد.
    </footer>
  </main>
  {render_question_modal()}
  <script src="dashboard.js"></script>
</body>
</html>
'''


def detect_timestamp_warnings(conn: sqlite3.Connection) -> list[str]:
    warnings = []
    for column in ("created_at", "started_at", "completed_at"):
        bad = conn.execute(
            f"""
            SELECT COUNT(*)
            FROM dashboard_sessions
            WHERE {column} IS NOT NULL
              AND {column} <> ''
              AND {column} NOT GLOB '????-??-??T??:??:??*';
            """
        ).fetchone()[0]
        if bad:
            warnings.append(f"{bad} مقدار در ستون {column} شبیه ISO timestamp نیست.")
    return warnings


def build_dashboard() -> tuple[int, int, list[str], Path, Path | None]:
    ensure_directories()
    write_static_assets()

    answerers_dump_path = resolve_latest_backup_path(
        ANSWERERS_BACKUP_GLOB,
        "POLIMETER_ANSWERERS_DUMP_PATH",
        required=True,
    )
    metrics_snapshot_path = resolve_latest_backup_path(
        METRICS_SNAPSHOT_GLOB,
        "POLIMETER_METRICS_SNAPSHOT_PATH",
        required=False,
    )
    metrics_snapshot, metrics_warnings = read_metrics_snapshot(metrics_snapshot_path)
    live_metrics_snapshot, live_metrics_warnings = fetch_live_metrics_counter()
    if live_metrics_snapshot is not None:
        metrics_snapshot = live_metrics_snapshot
    elif metrics_snapshot is not None:
        live_metrics_warnings = []
    question_bank, question_warnings = load_question_bank()
    conn = create_database_from_dump(answerers_dump_path)
    try:
        register_question_bank(conn, question_bank)
        schema_warnings = create_dashboard_views(conn)
        session_count = int(conn.execute("SELECT COUNT(*) FROM dashboard_sessions").fetchone()[0])
        answer_count = int(conn.execute("SELECT COUNT(*) FROM dashboard_answers").fetchone()[0])
        warnings = [
            *question_warnings,
            *metrics_warnings,
            *live_metrics_warnings,
            *schema_warnings,
            *detect_timestamp_warnings(conn),
        ]
        results = load_and_export_queries(conn)
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        INDEX_PATH.write_text(
            build_dashboard_html(
                results,
                question_bank,
                warnings,
                generated_at,
                answerers_dump_path,
                metrics_snapshot,
            ),
            encoding="utf-8",
        )
    finally:
        conn.close()
    return session_count, answer_count, warnings, answerers_dump_path, metrics_snapshot_path


def serve(host: str, port: int, open_browser: bool) -> None:
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((host, port), handler)
    url = f"http://{host}:{port}"
    print(f"Server URL: {url}")
    print(f"Dashboard path: {INDEX_PATH}")
    if open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and serve the local Polimeter analytics dashboard.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--build-only", action="store_true", help="Generate files without starting the HTTP server.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser automatically.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    session_count, answer_count, warnings, answerers_dump_path, metrics_snapshot_path = build_dashboard()

    print(f"answerer_sessions rows: {session_count}")
    print(f"answerer_answers rows: {answer_count}")
    print(f"Answerers dump: {answerers_dump_path}")
    print(f"Metrics snapshot: {metrics_snapshot_path or 'missing'}")
    print(f"Dashboard path: {INDEX_PATH}")
    print(f"SQLite path: {DB_PATH}")
    if warnings:
        for warning in warnings:
            print(f"WARNING: {warning}")
    else:
        print("Timestamp check: no non-ISO-like values detected.")

    if args.build_only:
        print("Server URL: build-only mode")
        return

    serve(args.host, args.port, open_browser=not args.no_open)


if __name__ == "__main__":
    main()
