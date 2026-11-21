import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = Object.fromEntries(
  ['NODE_ENV', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'URL', 'RENDER_EXTERNAL_URL', 'CLIENT_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']
    .map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

describe('Vercel environment configuration', () => {
  it('uses Vercel production settings and the deployment URL', async () => {
    process.env.NODE_ENV = '';
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_URL = 'reading-room-test.vercel.app';
    process.env.URL = '';
    process.env.RENDER_EXTERNAL_URL = '';
    process.env.CLIENT_URL = '';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    vi.resetModules();
    const { env } = await import('../config/env.js');

    expect(env.nodeEnv).toBe('production');
    expect(env.isProduction).toBe(true);
    expect(env.clientUrl).toBe('https://reading-room-test.vercel.app');
  });
});
