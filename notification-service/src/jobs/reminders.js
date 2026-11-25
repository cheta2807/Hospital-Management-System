const cron = require("node-cron");
const config = require("../config");
const { sendMail } = require("../services/mail");

const seenInDryRun = new Set(); // avoid repeating the same dry-run log every hour

async function runReminders() {
  if (!config.internalKey) return console.warn("[reminders] INTERNAL_API_KEY not set, skipping.");
  const headers = { "X-Internal-Key": config.internalKey };
  try {
    const res = await fetch(`${config.djangoUrl}/api/internal/reminders/`, { headers });
    if (!res.ok) return console.error(`[reminders] Django answered ${res.status}`);
    const items = await res.json();

    for (const a of items) {
      if (!a.patient_email) continue;
      if (!config.smtp.host && seenInDryRun.has(a.id)) continue;
      const sent = await sendMail({
        to: a.patient_email,
        subject: `Appointment reminder: ${a.date} at ${a.start_time}`,
        text:
          `Hello ${a.patient_name},\n\nThis is a reminder of your appointment with ${a.doctor_name} ` +
          `on ${a.date} at ${a.start_time}.\n\n${config.hospitalName}`,
      });
      if (sent) await fetch(`${config.djangoUrl}/api/internal/reminders/${a.id}/sent/`, { method: "POST", headers });
      else seenInDryRun.add(a.id);
    }
    console.log(`[reminders] checked ${items.length} upcoming appointment(s)`);
  } catch (err) {
    console.error("[reminders] failed:", err.message);
  }
}

function startReminderJob() {
  if (!config.remindersEnabled) return console.log("[reminders] disabled");
  cron.schedule(config.reminderCron, runReminders);
  console.log(`[reminders] scheduled (${config.reminderCron})`);
}

module.exports = { startReminderJob, runReminders };
