import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { unauthorized } from '../utils/apiError.js';

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function signAccess(subject, subjectType = 'User') {
  return jwt.sign({ sub: subject.toString(), subjectType }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
}

export async function issueRefresh(subject, subjectType, req) {
  const token = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    token: hash(token),
    subject,
    subjectType,
    expiresAt: new Date(Date.now() + env.jwt.refreshDays * 86400 * 1000),
    userAgent: req?.headers?.['user-agent']?.slice(0, 300),
    ip: req?.ip,
  });
  return token;
}

export async function rotateRefresh(token, req) {
  if (!token) throw unauthorized('No refresh token');
  const record = await RefreshToken.findOne({ token: hash(token) });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw unauthorized('Invalid or expired refresh token');
  }

  const newToken = await issueRefresh(record.subject, record.subjectType, req);
  record.revokedAt = new Date();
  record.replacedBy = hash(newToken);
  await record.save();

  return {
    token: newToken,
    subject: record.subject,
    subjectType: record.subjectType,
  };
}

export async function revokeRefresh(token) {
  if (!token) return;
  await RefreshToken.updateOne({ token: hash(token) }, { revokedAt: new Date() });
}

export async function revokeAllFor(subject, subjectType) {
  await RefreshToken.updateMany({ subject, subjectType, revokedAt: null }, { revokedAt: new Date() });
}

export { hash as hashToken };
