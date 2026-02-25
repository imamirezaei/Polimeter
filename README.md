# Polimeter

Polimeter is a Persian-first political concept quiz app (RTL) focused on early-stage conceptual literacy rather than hard ideological labeling.

## Project Overview

- UI language: Persian (`fa-IR`, RTL)
- App type: lightweight SPA with Vanilla JS
- Quiz size per run: 20 balanced random questions
- Axes: economy, domestic policy, foreign policy, Iran history, national security
- Output: overall score, left score, right score, axis breakdown, answer review

## Tech Stack

- Frontend: `index.html`, `style.css`, `app.js`
- Question bank: `data/questions.js`
- Optional backend API: `server.js` (Express)
- Static metrics file: `storage/metrics.json`
- GitHub Pages CI/CD: `.github/workflows/deploy-pages.yml`

## Methodology (فارسی)

### 1) نمره کل

نمره کل با **Weighted Accuracy** محاسبه می‌شود:

`TotalScore = 100 * (sum(weight_i * correct_i) / sum(weight_i))`

- `correct_i` برای پاسخ درست `1` و برای پاسخ غلط `0` است.
- وزن هر سوال از بانک سوال خوانده می‌شود.
- انتخاب «نظری ندارم» برای همان سوال امتیاز صفر در نظر می‌گیرد.

### 2) نمره چپ و راست

نمره چپ/راست با **Weighted F1** (one-vs-rest) محاسبه می‌شود:

- `TP`: وقتی کاربر همان سمت درست را انتخاب کرده باشد
- `FP`: وقتی کاربر آن سمت را انتخاب کند ولی پاسخ درست سمت مقابل باشد
- `FN`: وقتی پاسخ درست آن سمت بوده ولی کاربر آن سمت را انتخاب نکرده باشد

سپس:

- `Precision = TP / (TP + FP)`
- `Recall = TP / (TP + FN)`
- `F1 = 2 * Precision * Recall / (Precision + Recall)`
- `SideScore = 100 * F1`

این مدل باعث می‌شود انتخاب یک‌طرفه (مثلا همه پاسخ‌ها فقط چپ) به‌صورت مصنوعی نمره کامل تولید نکند.

### 3) وزن‌دهی سوال‌ها

همه سوال‌ها وزن برابر ندارند. وزن بر اساس محور و قطعیت محتوایی تعیین می‌شود و در بازه `0.70` تا `1.30` اعتبارسنجی می‌گردد.

## Privacy Model

- Default behavior: no answer data is stored.
- With explicit consent checkbox: answers can be sent anonymously for aggregate analysis.
- No personal identity fields are stored.

## Repository Structure

```text
.
├── index.html
├── style.css
├── app.js
├── data/
│   └── questions.js
├── storage/
│   └── metrics.json
├── server.js
└── .github/workflows/
    └── deploy-pages.yml
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

Default local URL: `http://localhost:8787`

## Static Mode (No Backend)

The project can run fully static (e.g., GitHub Pages):

- Quiz flow works end-to-end in the browser.
- Participant counter is global via `counterapi.dev` in static runtime.
- `storage/metrics.json` is used as an additional fallback source when available.
- Local fallback counter is maintained in `localStorage`.
- `/api/*` requests are only used when a runtime API is available.

## Reliable Cross-Device Counter (Server-Side)

If you need a real shared counter between laptop/mobile/incognito sessions, use the backend API.
GitHub Pages alone cannot persist shared writes.

### Recommended setup

1. Deploy `server.js` as a separate web service (Render is preconfigured via `render.yaml`).
2. Set `CORS_ALLOWED_ORIGIN` on the API service to your frontend origin:
   - `https://imamirezaei.github.io`
3. Set your GitHub Pages frontend API base URL in `index.html`:

```html
<meta name="polimeter-api-base-url" content="https://YOUR-API-DOMAIN" />
```

After that, every click on `شروع تست` calls `POST /api/metrics/start` and the counter becomes truly global.

## GitHub Pages Deployment

The repository already includes a Pages workflow:

- Workflow file: `.github/workflows/deploy-pages.yml`
- Trigger: push to `main` or `master` (plus manual dispatch)
- Build artifact: static files copied into `site/`
- Jekyll disabled via `site/.nojekyll`

### Enable Pages in GitHub

1. Open repository `Settings > Pages`.
2. Set source to `GitHub Actions`.
3. Push to `main` (or `master`).
4. Wait for the workflow to finish and publish the Pages URL.

## Optional External API

If you host API separately, set:

```html
<meta name="polimeter-api-base-url" content="https://your-api.example.com" />
```

Behavior:

- Empty meta value:
  - On `localhost`, same-origin API is used.
  - On GitHub Pages, static-only mode is used.
- Non-empty meta value:
  - Frontend sends requests to the configured external API base URL.

## Optional API Endpoints

### `GET /api/metrics`

```json
{ "ok": true, "start_count": 12, "updated_at": "..." }
```

### `POST /api/metrics/start`

```json
{
  "started_at": "2026-02-24T12:00:00.000Z",
  "quiz_version": "v1"
}
```

### `POST /api/submissions`

```json
{
  "consent_to_store_answers": true,
  "quiz_version": "v1",
  "started_at": "...",
  "completed_at": "...",
  "answers": [
    { "question_id": "eco_01", "selected_side": "left" },
    { "question_id": "eco_02", "selected_side": "neutral" }
  ]
}
```

## Development Notes

- `AXIS_BANKS` is the source-of-truth dataset in `data/questions.js`.
- Questions are normalized by `toQuestionRecord`.
- Validation enforces `axis_title`, `certainty`, and `weight`.
- Quiz length is controlled by `QUIZ_SIZE` in `app.js`.

## License

This project is released under the [MIT License](./LICENSE).
