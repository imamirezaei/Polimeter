# پُلیمتر

آزمون مفهومی فارسی برای سنجش آشنایی با مفاهیم مرتبط با سنت‌های فکری چپ و راست.

## ویژگی‌ها
- نمره‌دهی کاملا محلی و deterministic
- بدون ذخیره داده هویتی کاربر
- ذخیره پاسخ‌ها فقط با رضایت اختیاری (checkbox)
- شمارنده تعداد شروع آزمون به‌صورت سروری
- سازگار با معماری Frontend/Backend جدا

## رفتار داده
- **همیشه ثبت می‌شود:** شمارنده شروع آزمون
- **فقط با رضایت کاربر ثبت می‌شود:** پاسخ‌های آزمون (`question_id + selected_side`)
- **هرگز ذخیره نمی‌شود:** اطلاعات هویتی (نام، ایمیل، تلفن، IP، user-agent)

## ساختار فایل
- `index.html`
- `style.css`
- `app.js`
- `data/questions.js`
- `server.js`

## APIها
### `GET /api/metrics`
نمایش شمارنده شروع آزمون:
```json
{ "ok": true, "start_count": 12, "updated_at": "..." }
```

### `POST /api/metrics/start`
افزایش شمارنده شروع آزمون:
```json
{
  "started_at": "2026-02-24T12:00:00.000Z",
  "quiz_version": "v1"
}
```

### `POST /api/submissions`
ذخیره پاسخ‌ها (فقط با رضایت):
```json
{
  "consent_to_store_answers": true,
  "quiz_version": "v1",
  "started_at": "...",
  "completed_at": "...",
  "answers": [
    { "question_id": "C01", "selected_side": "left" }
  ]
}
```

### `GET /api/admin/export`
خروجی NDJSON برای تحلیل (نیازمند هدر `x-admin-token`).

## اجرای لوکال
```bash
npm install
npm run dev
```

آدرس پیش‌فرض:
- `http://localhost:8787`

اگر پورت اشغال باشد، سرور خودکار روی پورت بعدی بالا می‌آید.

## تنظیمات محیطی
نمونه در `.env.example`:
- `PORT`
- `MAX_PORT_ATTEMPTS`
- `CORS_ALLOWED_ORIGIN`
- `ADMIN_EXPORT_TOKEN`

## استقرار پیشنهادی
- Frontend: GitHub Pages
- Backend: سرویس جدا (Render / Fly / Railway / ...)

برای اتصال فرانت به بک‌اند جدا:
- در `index.html` مقدار `<meta name="polimeter-api-base-url" content="...">` را روی URL بک‌اند قرار دهید.
