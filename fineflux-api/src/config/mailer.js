const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: { user: env.smtpUser, pass: env.smtpPass }
});

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({ from: env.smtpFrom, to, subject, html, text });
}

module.exports = { transporter, sendMail };
