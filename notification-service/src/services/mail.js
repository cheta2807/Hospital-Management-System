const nodemailer = require("nodemailer");
const config = require("../config");

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

/** Returns true if a real email was sent; false when SMTP is not configured (dry-run). */
async function sendMail({ to, subject, text }) {
  if (!transporter) {
    console.log(`[mail:dry-run] to=${to} subject="${subject}"\n${text}\n`);
    return false;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, text });
  return true;
}

module.exports = { sendMail };
