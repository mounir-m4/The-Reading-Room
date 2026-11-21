import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter, sanitizeInput } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { logger } from './utils/logger.js';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Vite SPA + external images need relaxed CSP; hardened via hosting.
  }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(compression());
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan('tiny', { stream: { write: (msg) => logger.info(msg.trim()) } }));
  app.use(express.json({
    limit: '2mb',
    // Keep the untouched payload for Stripe signature verification.
    verify: (req, _res, buf) => {
      if (req.originalUrl?.startsWith('/api/payments/webhook')) req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(sanitizeInput);
  app.use('/api', apiLimiter, routes);

  // Local uploads are unavailable on read-only serverless filesystems.
  if (!env.isServerless) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));
    } catch (error) {
      logger.warn(`Local uploads disabled: ${error.message}`);
    }
  }

  // SEO files & built SPA
  const clientDist = path.resolve(appDirectory, '../../client/dist');
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${env.clientUrl}/sitemap.xml\n`));
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const { Book } = await import('./models/Book.js');
      const books = await Book.find({ isPublished: true }).select('slug updatedAt').limit(1000).lean();
      const base = env.clientUrl;
      const urls = ['', '/shop', '/about', '/contact', '/authors', '/categories',
        ...books.map((b) => `/books/${b.slug}`)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}\n</urlset>`;
      res.type('application/xml').send(xml);
    } catch (error) {
      res.type('application/xml').send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
    }
  });

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1y', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
