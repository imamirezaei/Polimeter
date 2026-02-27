#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"

: "${POLIMETER_ANSWERERS_DB_NAME:=polimeter-answerers}"
: "${POLIMETER_METRICS_DB_NAME:=polimeter-metrics}"
: "${POLIMETER_METRICS_KEY:=quiz_starts_total}"

mkdir -p "$BACKUP_DIR"

ANSWERERS_DUMP_PATH="$BACKUP_DIR/polimeter-answerers-${TIMESTAMP}.sql"
METRICS_SNAPSHOT_PATH="$BACKUP_DIR/polimeter-metrics-${TIMESTAMP}.json"
RAW_METRICS_JSON="$(mktemp)"

cleanup() {
  rm -f "$RAW_METRICS_JSON"
}
trap cleanup EXIT

echo "Exporting answerers backup to $ANSWERERS_DUMP_PATH"
npx wrangler d1 export "$POLIMETER_ANSWERERS_DB_NAME" --remote --output="$ANSWERERS_DUMP_PATH"

echo "Fetching metrics counter snapshot from $POLIMETER_METRICS_DB_NAME/$POLIMETER_METRICS_KEY"
npx wrangler d1 execute "$POLIMETER_METRICS_DB_NAME" \
  --remote \
  --json \
  --yes \
  --command="SELECT \"key\", value, updated_at FROM metrics_counters WHERE \"key\" = '${POLIMETER_METRICS_KEY}' LIMIT 1" \
  > "$RAW_METRICS_JSON"

python3 - "$RAW_METRICS_JSON" "$METRICS_SNAPSHOT_PATH" "$POLIMETER_METRICS_DB_NAME" "$POLIMETER_METRICS_KEY" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

raw_path = Path(sys.argv[1])
snapshot_path = Path(sys.argv[2])
database_name = sys.argv[3]
expected_key = sys.argv[4]

raw = json.loads(raw_path.read_text(encoding="utf-8"))
rows = []
if isinstance(raw, list):
    for entry in raw:
        if isinstance(entry, dict) and isinstance(entry.get("results"), list):
            rows = entry["results"]
            break
elif isinstance(raw, dict) and isinstance(raw.get("results"), list):
    rows = raw["results"]

row = rows[0] if rows else {}
try:
    value = int(float(row.get("value", 0)))
except (TypeError, ValueError):
    value = 0

payload = {
    "database": database_name,
    "key": str(row.get("key") or expected_key),
    "value": max(0, value),
    "updated_at": str(row.get("updated_at") or ""),
    "fetched_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
}
snapshot_path.write_text(
    json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
PY

echo "Rebuilding dashboard"
python3 "$ROOT_DIR/local-dashboard/app.py" --build-only

echo "Done"
echo "  Answerers backup: $ANSWERERS_DUMP_PATH"
echo "  Metrics snapshot: $METRICS_SNAPSHOT_PATH"
