const nodemailer = require('nodemailer');

function transporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendMail({ to, subject, text, html }) {
  const t = transporter();
  if (!t) {
    console.log('[mail] SMTP not configured (SMTP_HOST) - skipping email to ' + to);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || (process.env.SMTP_USER || 'PM Store'),
      to,
      subject,
      text,
      html,
    });
    console.log('[mail] sent to ' + to);
    return true;
  } catch (err) {
    console.error('[mail] failed to send to ' + to + ': ' + err.message);
    return false;
  }
}

module.exports = { sendMail };
