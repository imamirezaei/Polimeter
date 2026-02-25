CREATE TABLE IF NOT EXISTS metrics_counters (
  "key" TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics_events (
  event_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

INSERT INTO metrics_counters ("key", value, updated_at)
VALUES ('quiz_starts_total', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT("key") DO NOTHING;
