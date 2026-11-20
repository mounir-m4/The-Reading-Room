import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter;

if (env.smtp.host && env.smtp.user) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
} else {
  // Safe development mode: messages are logged, never silently "sent".
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

export async function sendMail({ to, subject, html, text }) {
  const info = await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
  if (!env.smtp.host) {
    console.info('[mail:dev]', subject, '→', to, '\n', info.message?.slice(0, 400));
  }
  return info;
}
