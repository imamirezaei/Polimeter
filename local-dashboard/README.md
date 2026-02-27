# Polimeter Dashboard

This directory contains the source for the Polimeter analytics dashboard.

## Data Sources

The dashboard reads from two files inside `backups/`:

- The latest `polimeter-answerers-*.sql`
- The latest `polimeter-metrics-*.json`

The SQL file is the backup of stored answer data. The JSON file is a snapshot of the Cloudflare `metrics_counters` row from the `polimeter-metrics` database.

During dashboard builds, the script also tries to fetch the current participant counter from the public Cloudflare API and falls back to the latest snapshot if the live request is unavailable.

You can override the input paths if needed:

```bash
POLIMETER_ANSWERERS_DUMP_PATH=/abs/path/to/answerers.sql \
POLIMETER_METRICS_SNAPSHOT_PATH=/abs/path/to/metrics.json \
python3 local-dashboard/app.py --build-only
```

You can also override the live counter endpoint:

```bash
POLIMETER_COUNTER_API_URL=https://your-worker.workers.dev/api/metrics/start \
python3 local-dashboard/app.py --build-only
```

## Outputs

The script generates:

- `local-dashboard/index.html`
- `local-dashboard/style.css`
- `local-dashboard/dashboard.js`
- `local-dashboard/outputs/polimeter.sqlite`
- `local-dashboard/outputs/csv/*.csv`

`index.html`, `style.css`, and `dashboard.js` are build artifacts and are published to GitHub Pages.

## Running Locally

From the project root:

```bash
python3 local-dashboard/app.py
```

Or build only:

```bash
python3 local-dashboard/app.py --build-only
```

Local URL:

```text
http://127.0.0.1:5177
```

## Metric Notes

- Overall, left, and right accuracy KPI values use the current negative-marking logic.
- Axis summary accuracy also uses the current negative-marking logic, applied separately inside the `left` and `right` buckets before aggregation.
- Total participants come from Cloudflare metrics data.
- Total stored participants come from the saved answer backup.
- Save rate is `stored participants / total participants`.
- The question-quality table remains a raw correctness-rate view per question and shows neutral share separately.

## Automatic Refresh

The GitHub Actions refresh workflow runs every 24 hours and can also be triggered manually. It:

1. Exports a fresh answerer backup from Cloudflare D1
2. Saves a fresh `metrics_counters` snapshot
3. Rebuilds the dashboard
4. Pushes backup updates so GitHub Pages can publish the refreshed dashboard
