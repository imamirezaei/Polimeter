# Polimeter

Polimeter is a Persian RTL political-concept quiz focused on conceptual literacy, not ideological labeling.

## Methodological Position

Polimeter is designed around a simple methodological principle: assess conceptual understanding before identity classification.

- It does not try to classify users into fixed political camps.
- It evaluates how users reason across multiple policy dimensions.
- It uses weighted scoring and balanced question sampling to reduce single-axis bias.
- It treats uncertainty (`neutral`) as a valid response while still modeling its score impact.

### Scoring Method

Polimeter computes three core score outputs:

1. Total score (Weighted Accuracy)

```text
TotalScore = 100 * (sum(weight_i * correct_i) / sum(weight_i))
```

- `correct_i` is `1` for a correct answer, `0` otherwise.
- Question weights are loaded from the question bank.
- `neutral` is scored as incorrect for that question.

2. Left and Right scores (Weighted F1, one-vs-rest)

```text
Precision = TP / (TP + FP)
Recall    = TP / (TP + FN)
F1        = 2 * Precision * Recall / (Precision + Recall)
SideScore = 100 * F1
```

This avoids inflated scores from one-sided response patterns.

3. Axis breakdown

- Each question belongs to an axis.
- Axis-level totals and correctness are reported.
- Axis percentages are computed with weighted correctness.

## Social Concern

Polimeter addresses a social risk in political discussion: premature identity assignment with low conceptual grounding.

The project intentionally prioritizes:

- Concept-first learning before ideology labels.
- Transparent scoring logic users can inspect.
- Reduced polarization pressure in early engagement.
- Explicit consent before storing response data.
- Anonymous storage with no personal identity fields.

## Product Behavior

- UI language: Persian (`fa-IR`, RTL)
- Quiz mode: client-side SPA (Vanilla JS)
- Questions per run: 20
- Axes: economy, domestic policy, foreign policy, history, national security
- Output: total score, side scores, axis breakdown, review list

## Architecture

### Frontend

- Static app hosted on GitHub Pages
- Files: `index.html`, `style.css`, `app.js`, `data/questions.js`

### Backend

- Cloudflare Worker: `cloudflare-worker/src/index.js`
- Two D1 databases:
  - Metrics DB (`DB`) for global participant counter
  - Answerer DB (`ANSWERS_DB`) for per-answerer consented submissions

### Current API Surface

- `GET /api/metrics/start`
  - Returns global participant count.
- `POST /api/metrics/start`
  - Accepts `{ eventId }`.
  - Idempotent increment using event deduplication.
- `POST /api/submissions`
  - Accepts anonymous consented submission payload.
  - Stores one row per answerer with raw JSON payload.

## Data Model

### Metrics DB (`DB`)

Used for global participation counter.

- `metrics_counters`
  - `key` TEXT PRIMARY KEY
  - `value` INTEGER NOT NULL
  - `updated_at` TEXT NOT NULL

- `metrics_events`
  - `event_id` TEXT PRIMARY KEY
  - `created_at` TEXT NOT NULL

### Answerer DB (`ANSWERS_DB`)

Used for per-answerer anonymous response storage.

- `answerer_submissions`
  - `answerer_id` TEXT PRIMARY KEY
  - `created_at` TEXT NOT NULL
  - `submission_json` TEXT NOT NULL (`json_valid`)
  - `submission_json` keeps the full consented payload in raw JSON form.

## Consent and Privacy

Default behavior: no answer submission is stored.

Only when the user explicitly checks the consent box, the frontend sends:

- selected side per question
- correctness metadata
- axis metadata
- quiz/session timestamps

No direct personal identifiers are stored by this flow.

## Frontend Integration Notes

Configured in `index.html` via meta tags:

```html
<meta name="polimeter-counter-api-base-url" content="https://YOUR-WORKER.workers.dev" />
<meta name="polimeter-submission-api-base-url" content="https://YOUR-WORKER.workers.dev" />
```

Flow:

1. Page load calls `GET /api/metrics/start`.
2. Clicking Start calls `POST /api/metrics/start` with a UUID event id.
3. On results page, if consent is enabled, frontend calls `POST /api/submissions`.

## Cloudflare Setup (Two D1 Databases)

Example Worker config is in:

- `cloudflare-worker/wrangler.toml.example`

It defines two D1 bindings:

- `DB` with `migrations_dir = "migrations"`
- `ANSWERS_DB` with `migrations_dir = "migrations-answerer"`

### Typical deployment steps

1. Create metrics DB:

```bash
npx wrangler d1 create polimeter-metrics
```

2. Create answerer DB:

```bash
npx wrangler d1 create polimeter-answerers
```

3. Add both database IDs to `wrangler.toml`.

4. Apply migrations:

```bash
npx wrangler d1 migrations apply DB --remote --config wrangler.toml
npx wrangler d1 migrations apply ANSWERS_DB --remote --config wrangler.toml
```

5. Deploy Worker:

```bash
npx wrangler deploy --config wrangler.toml
```

## Local Development

Install dependencies:

```bash
npm install
```

Run local dev server:

```bash
npm run dev
```

Default local URL: `http://localhost:8787`

## Repository Structure

```text
.
├── index.html
├── style.css
├── app.js
├── data/
│   └── questions.js
├── cloudflare-worker/
│   ├── src/
│   │   └── index.js
│   ├── migrations/
│   │   ├── 0001_metrics_tables.sql
│   │   └── 0002_quiz_submissions.sql
│   ├── migrations-answerer/
│   │   ├── 0001_answerer_schema.sql
│   │   └── 0002_answerer_json_storage.sql
│   └── wrangler.toml.example
└── .github/workflows/
    └── deploy-pages.yml
```

## License

This project is released under the [MIT License](./LICENSE).
