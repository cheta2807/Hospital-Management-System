const list = (value, fallback) =>
  (value || fallback).split(",").map((v) => v.trim()).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 5000),
  djangoUrl: (process.env.DJANGO_API_URL || "http://localhost:8000").replace(/\/$/, ""),
  internalKey: process.env.INTERNAL_API_KEY || "",
  corsOrigins: list(process.env.CORS_ORIGINS, "http://localhost:3000,http://localhost:5173"),
  // Optional: allow every https://*.vercel.app preview if you set CORS_ALLOW_VERCEL=true
  allowVercel: process.env.CORS_ALLOW_VERCEL === "true",
  reminderCron: process.env.REMINDER_CRON || "0 * * * *", // hourly
  remindersEnabled: process.env.REMINDERS_ENABLED !== "false",
  hospitalName: process.env.HOSPITAL_NAME || "City Care Hospital",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "no-reply@hospital.local",
  },
};
