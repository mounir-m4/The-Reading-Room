# Deploying The Reading Room

## Deployment options

| Layer | Platform | Why |
| --- | --- | --- |
| Static client + API | **Netlify** | Supports commercial projects and built-in HTTPS/serverless functions. Its Free plan has a monthly credit limit. |
| Database | **MongoDB Atlas** | Free shared M0 cluster. |
| Testing deployment | **Vercel Hobby** | Free and card-free for personal, non-commercial testing. |

Netlify hosts the Vite build as static files and runs the Express API as a serverless function through `netlify/functions/api.js`. A single Netlify domain means refresh cookies, CORS and client-side routing work without a separate backend host. Vercel Hobby is an alternative for this project’s personal testing only; its terms do not allow commercial use.

> **Why not Render?** Render currently asks for a credit card to verify identity, so it does not fit your requirement.
>
> **Vercel for testing:** Vercel Hobby is free and card-free, but its terms restrict it to non-commercial personal use. Do not use it for a commercial bookstore.
>
> **Why not Cloudflare Workers?** It is a good free platform, but this Express app needs Node compatibility, a Durable Object for database connections and more invasive changes than Netlify.

Free-tier caveats:

- Netlify's new credit-based Free plan includes **300 credits/month** with a hard limit. A production deploy costs 15 credits, bandwidth 20 credits/GB and web requests 2 credits per 10,000. When credits run out, all sites on the account pause until the next billing cycle.
- Netlify Functions are serverless: uploads need Cloudinary because the filesystem is read-only. The seeded demo books use external Unsplash images, so the demo works without it.
- Vercel Hobby has its own usage limits and is for personal, non-commercial testing only.
- Atlas free clusters can pause after prolonged inactivity and resume on the next request.

---

## Deploy on Vercel Hobby for testing

The repository includes `vercel.json` and a shared Express function in `api/index.js`. Vercel builds the Vite client into `client/dist` and serves its static files; API and SEO requests are rewritten to the shared Express function, while SPA routes fall back to `index.html`. `/api/health` does not require MongoDB, while other API requests connect to Atlas.

1. Import `mounir-m4/The-Reading-Room` into Vercel and keep the project root at the repository root.
2. Use the Hobby plan for personal testing only.
3. In **Project Settings → Environment Variables**, set these variables for **Production** (and Preview if you plan to use preview deployments):
   - `MONGO_URI` (your Atlas connection string)
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (two distinct, long random values)
   - `CLIENT_URL` (the deployed Vercel URL, if automatic URL detection is not available)
4. Deploy the project. Vercel reads the framework, build command, output directory, and rewrites from `vercel.json`.
5. Verify `/api/health`, then check the storefront and `/api/books`.

Do not paste secrets into chat or commit them to GitHub. Enter them directly in Vercel’s Environment Variables settings. Seed the Atlas database using the local shell instructions above if the selected database is empty. Optional payment, email and image-upload integrations require their corresponding credentials; keep real payments disabled for a test deployment.

The Vercel Hobby plan is not suitable for a commercial bookstore. Keep the existing Netlify project if you want to retain its current published site; deploying to Vercel does not require deleting it.

---

## 1. Create the MongoDB Atlas database

1. Sign up at <https://www.mongodb.com/atlas> and create a **Free** shared cluster (M0).
2. Under **Database Access**, create a user with `readWrite` on `the_reading_room` and a strong password.
3. Under **Network Access**, add `0.0.0.0/0` for the demo. Serverless functions do not have a static outbound IP.
4. Copy the SRV connection string from **Connect → Drivers → Node.js**:

```text
mongodb+srv://USER:PASSWORD@cluster.mongodb.net/the_reading_room?retryWrites=true&w=majority
```

---

## 2. Deploy on Netlify

The repository already contains `netlify.toml` and the API function. Its `/api/*` rewrite preserves the API path when invoking the function, so Express can match routes such as `/api/health`.

1. Push your latest `main` branch to GitHub.
2. In Netlify, click **Add new site → Import an existing project**.
3. Choose GitHub and select `mounir-m4/The-Reading-Room`.
4. Netlify reads `netlify.toml` automatically:
   - **Build command:** `npm install && npm run build --workspace client`
   - **Publish directory:** `client/dist`
   - **Functions directory:** `netlify/functions`
   - **Node version:** 20
5. Add the environment variables below before deploying.
6. Click **Deploy site**.

Netlify exposes the site URL as `URL`, and the server uses it automatically for CORS, sitemap links and secure cookies. You do not need to set `CLIENT_URL` unless you use a custom domain with a different hostname.

---

## 3. Environment variables

In **Site configuration → Environment variables**, add:

| Variable | Required | Value |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `MONGO_URI` | Yes | Atlas SRV connection string |
| `MONGODB_DB` | No | Database containing the app data; defaults to `the_reading_room` |
| `JWT_ACCESS_SECRET` | Yes | Long random value, different from the refresh secret |
| `JWT_REFRESH_SECRET` | Yes | Long random value, different from the access secret |
| `CLIENT_URL` | No | Defaults to the platform URL (`URL` on Netlify or `VERCEL_URL` on Vercel); set your custom domain if needed |
| `MAIL_FROM` | No | `The Reading Room <hello@thereadingroom.test>` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Recommended | Enables persistent admin image uploads |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | Enables real email delivery |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` | No | Only for real card payments |

Generate each JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The app refuses to start in production if JWT secrets are missing or still contain `change-me`. Vercel sets `VERCEL_ENV`; you do not need to add `NODE_ENV` there.

---

## 4. Seed the live database

The seed scripts must run against the Atlas database.

### Option A — Local shell (easiest)

**Windows PowerShell:**

```powershell
$env:MONGO_URI = "mongodb+srv://USER:PASSWORD@cluster.mongodb.net/the_reading_room?retryWrites=true&w=majority"
npm.cmd run seed
npm.cmd run seed:demo
```

**macOS/Linux:**

```bash
MONGO_URI="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/the_reading_room?retryWrites=true&w=majority" npm run seed
MONGO_URI="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/the_reading_room?retryWrites=true&w=majority" npm run seed:demo
```

### Option B — Netlify build hook (one-time workaround)

Temporarily create a separate branch that runs `npm run seed && npm run seed:demo` in the Netlify build command, deploy it once, then remove the branch/deploy. The local shell option is simpler and safer.

`seed:demo` is idempotent and creates the full catalogue, orders and admin screens used in the README screenshots.

> The demo credentials are public in `README.md`. That is acceptable for a demo, but before treating the site as a real store, change/remove those users and set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to private values before running `npm run seed`.

---

## 5. Verify the deployment

1. Open the Netlify URL, e.g. `https://the-reading-room.netlify.app`.
2. Check `/api/health` returns `{"success":true,"data":{"status":"ok"}}`.
3. Load the storefront, `/shop`, a book detail page, `/cart` and `/checkout`.
4. Sign in with `reader@bookstore.test` / `Reader@12345` and place a test COD/mock order.
5. Sign in at `/admin` with `admin@bookstore.test` / `Admin@12345` and open Dashboard, Orders and Inventory.
6. Switch language to Arabic and confirm RTL layout.
7. Open the browser console and confirm no CORS, mixed-content or 404 errors.

If the first request is slow, the serverless function and Atlas cluster are waking up.

---

## 6. Optional production upgrades

- **Custom domain:** Netlify Free includes custom domains with automatic TLS. Add it under **Domain management**, then set `CLIENT_URL` to the custom domain if it differs from the Netlify URL.
- **Cloudinary:** Add the `CLOUDINARY_*` variables so uploaded images survive function restarts.
- **SMTP:** Add SMTP variables so verification and order emails are delivered instead of logged.
- **Stripe:** Add Stripe keys, set the webhook endpoint to `https://<your-domain>/api/payments/webhook`, and use `STRIPE_WEBHOOK_SECRET` from that endpoint.
- **Monitoring:** Point an uptime check at `/api/health`.

---

## 7. Local verification before deploying

```bash
npm.cmd run lint
npm.cmd test
npm.cmd run build --workspace client
```

You can also invoke the Netlify function locally with a fake event:

```powershell
$env:NETLIFY = "true"
node --input-type=module -e "import('./netlify/functions/api.js').then(async m => { const r = await m.handler({ path: '/api/health', httpMethod: 'GET', headers: { 'x-forwarded-for': '127.0.0.1' }, queryStringParameters: {}, body: null, isBase64Encoded: false, requestContext: { identity: { sourceIp: '127.0.0.1' } } }, {}); console.log(r.statusCode, r.body); process.exit(0); })"
```

Expected output contains `200` and `{"success":true,"data":{"status":"ok"}}`.

### Local DNS note

If seeding fails with `querySrv EREFUSED _mongodb._tcp.<cluster>.mongodb.net`, your local router/ISP DNS is refusing external SRV queries. Netlify is unaffected. To seed from this machine, temporarily point Node at public resolvers by creating a preload file:

```js
// atlas-dns-preload.mjs
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
```

Then run the scripts with that preload:

```powershell
node --import "file:///C:/path/to/atlas-dns-preload.mjs" server/src/scripts/seed.js
node --import "file:///C:/path/to/atlas-dns-preload.mjs" server/src/scripts/seedDemo.js
```

Alternatively, configure your router or Windows network adapter to use `8.8.8.8` / `1.1.1.1`.
