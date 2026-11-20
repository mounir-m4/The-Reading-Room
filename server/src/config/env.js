import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const number = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: number(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_reading_room',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    refreshDays: number(process.env.JWT_REFRESH_DAYS, 7),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: number(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'The Reading Room <hello@thereadingroom.test>',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  fx: {
    provider: process.env.EXCHANGE_RATE_PROVIDER || 'static',
    apiKey: process.env.EXCHANGE_RATE_API_KEY,
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@bookstore.test',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};

if (env.isProduction) {
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!process.env[key] || process.env[key].includes('change-me')) {
      throw new Error(`Missing secure ${key} in production`);
    }
  }
}
