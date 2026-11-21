import { createApp } from '../server/src/app.js';

const app = createApp();

export default function handler(req, res) {
  const url = new URL(req.url, 'https://vercel.local');
  const apiPath = url.searchParams.get('__vercel_api_path');
  const pagePath = url.searchParams.get('__vercel_page');

  if (apiPath !== null || pagePath !== null) {
    url.searchParams.delete('__vercel_api_path');
    url.searchParams.delete('__vercel_page');
    req.url = `${apiPath !== null ? `/api/${apiPath}` : `/${pagePath}`}${url.search}`;
  }

  return app(req, res);
}
