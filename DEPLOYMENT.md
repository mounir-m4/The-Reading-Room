# Deploying The Reading Room

## Recommended free stack

| Layer | Platform | Why |
| --- | --- | --- |
| Static client + API | **Netlify** | Free forever, **no credit card required**, allows commercial projects, built-in HTTPS and serverless functions. |
| Database | **MongoDB Atlas** | Free shared M0 cluster. |
| Domain | Netlify subdomain | `https://<site>.netlify.app` is included; custom domains are free too. |

Netlify hosts the Vite build as static files and runs the Express API as a serverless function through `netlify/functions/api.js`. A single Netlify domain means refresh cookies, CORS and client-side routing work without a separate backend host.

> **Why not Render?** Render currently asks for a credit card to verify identity, so it does not fit your requirement.
>
> **Why not Vercel?** Vercel Hobby is free and card-free, but its terms restrict it to non-commercial personal use. A bookstore that takes payments would need the paid Pro plan.
>
> **Why not Cloudflare Workers?** It is a good free platform, but this Express app needs Node compatibility, a Durable Object for database connections and more invasive changes than Netlify.

Free-tier caveats:

- Netlify's new credit-based Free plan includes **300 credits/month** with a hard limit. A production deploy costs 15 credits, bandwidth 20 credits/GB and web requests 2 credits per 10,000. When credits run out, all sites on the account pause until the next billing cycle.
- Netlify Functions are serverless: uploads need Cloudinary because the filesystem is read-only. The seeded demo books use external Unsplash images, so the demo works without it.
- Atlas free clusters can pause after prolonged inactivity and resume on the next request.

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

The repository already contains `netlify.toml` and the API function.

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
| `JWT_ACCESS_SECRET` | Yes | Long random value, different from the refresh secret |
| `JWT_REFRESH_SECRET` | Yes | Long random value, different from the access secret |
| `CLIENT_URL` | No | Defaults to Netlify's `URL`; set to your custom domain if needed |
| `MAIL_FROM` | No | `The Reading Room <hello@thereadingroom.test>` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Recommended | Enables persistent admin image uploads |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | Enables real email delivery |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` | No | Only for real card payments |

Generate each JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The app refuses to start in production if JWT secrets are missing or still contain `change-me`.

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
