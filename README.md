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

1. Total score (Left/right-penalized weighted accuracy)

```text
Penalty_j = WrongAnswers_j / 3
EffectiveCorrect_j = max(0, CorrectAnswers_j - Penalty_j)
TotalScore = 100 * (
  sum(weight_j * EffectiveCorrect_j) / sum(weight_j * TotalQuestions_j)
)
```

- `correct_i` is `1` for a correct answer, `0` otherwise.
- The penalty is applied separately inside the `left` and `right` answer buckets.
- Every wrong answer removes one-third of one correct answer from the same bucket.
- `neutral` is tracked separately and shown separately in the final results.

2. Left and Right scores (Penalized side performance)

```text
Penalty_j = WrongAnswers_j / 3
EffectiveCorrect_j = max(0, CorrectAnswers_j - Penalty_j)
SideScore_j = 100 * (EffectiveCorrect_j / TotalQuestions_j)
```

These are the same side-level percentages shown in the final alignment breakdown.

3. Axis breakdown

- Each question belongs to an axis.
- The quiz result page reports raw weighted correctness per axis.
- The published analytics dashboard reports per-axis penalized weighted accuracy and neutral share across stored responses.

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
- Participants dashboard is published under `local-dashboard/` on the same Pages site

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
- per-side result summary (including wrong-answer penalty and neutral counts)
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

## Dashboard Refresh via GitHub Actions

- `refresh-dashboard.yml` runs every 24 hours and can also be started manually.
- It exports the latest answerer backup from Cloudflare D1, snapshots `metrics_counters.value` from `polimeter-metrics`, and rebuilds the dashboard.
- Dashboard builds also try to read the live participant counter from the public Cloudflare Worker endpoint and fall back to the latest snapshot if needed.
- `deploy-pages.yml` rebuilds `local-dashboard/` during each Pages deployment and publishes it alongside the quiz.
- In the dashboard, overall KPIs, left/right summaries, and axis summaries use the current negative-marking logic; the question-quality table remains a raw per-question correctness view.

Required repository secrets for the scheduled refresh:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

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
├── local-dashboard/
│   ├── app.py
│   └── README.md
└── .github/workflows/
    ├── deploy-pages.yml
    └── refresh-dashboard.yml
```

## License

This project is released under the [MIT License](./LICENSE).
