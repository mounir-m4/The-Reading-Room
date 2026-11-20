# Deploying The Reading Room

## Recommended free stack

| Layer | Platform | Free tier purpose |
| --- | --- | --- |
| App + API | **Render Web Service** | Runs the Express server and serves the built Vite client from one domain. |
| Database | **MongoDB Atlas** | Free shared cluster (M0) for documents. |
| Domain | Render subdomain | `https://<service>.onrender.com` is included. |

**Why Render instead of Vercel/Netlify?** This project is a long-running Express app with `HttpOnly` refresh cookies, local-process state such as rate limiting, and local upload fallback. Render runs it unchanged on a single origin, so cookies, CORS and routing work without a serverless adapter. Vercel/Netlify can host the static client, but the API needs to be converted to serverless functions, uploads must use Cloudinary, and split-domain cookies need extra configuration. It is possible, but it is not the fastest path to a working free deployment.

> Free-tier caveats: Render free web services sleep after inactivity and have a cold start on the next request. Atlas free clusters can pause after prolonged inactivity and resume on first access. This is fine for a portfolio/demo, not for a production storefront.

---

## 1. Create the MongoDB Atlas database

1. Sign up at <https://www.mongodb.com/atlas> and create a **Free** shared cluster (M0). A provider/region such as AWS Frankfurt or AWS Paris is fine.
2. Under **Database Access**, create a database user with a strong password and the `readWrite` role on `the_reading_room`.
3. Under **Network Access**, add `0.0.0.0/0` for the demo. Render does not have a static outbound IP on the free plan. For a production deployment, restrict this to your service's egress IPs.
4. Click **Connect → Drivers → Node.js** and copy the SRV connection string. It looks like:

```text
mongodb+srv://USER:PASSWORD@cluster.mongodb.net/the_reading_room?retryWrites=true&w=majority
```

Replace `USER`, `PASSWORD`, and the cluster hostname with your own values.

---

## 2. Deploy with the Render Blueprint

`render.yaml` is included in the repository.

1. Push your latest `main` branch to GitHub.
2. In Render, click **New + → Blueprint**.
3. Connect the `The-Reading-Room` GitHub repository and select `main`.
4. Render reads `render.yaml` and asks for `MONGO_URI`. Paste the Atlas SRV URI.
5. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated automatically by Render.
6. Click **Apply** and wait for the first build to finish.

The Blueprint uses:

- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Health check:** `/api/health`
- **Node:** 18+ (set by `package.json` engines)

The server reads Render's built-in `RENDER_EXTERNAL_URL`, so CORS, sitemap URLs and secure cookies use your live URL automatically. You do not need to set `CLIENT_URL` for a single-service deployment.

### Manual Render setup (alternative)

If you do not use the Blueprint, create a **Web Service** with:

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/mounir-m4/The-Reading-Room` |
| Branch | `main` |
| Runtime | Node |
| Plan | Free |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Then add the environment variables from the table below.

---

## 3. Environment variables

| Variable | Required | Value |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `MONGO_URI` | Yes | Atlas SRV connection string |
| `JWT_ACCESS_SECRET` | Yes | Long random value; Blueprint generates it |
| `JWT_REFRESH_SECRET` | Yes | Different long random value; Blueprint generates it |
| `CLIENT_URL` | No | Defaults to Render's `RENDER_EXTERNAL_URL` |
| `PORT` | No | Render injects this; defaults to `5000` |
| `MAIL_FROM` | No | `The Reading Room <hello@thereadingroom.test>` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | No | Recommended if admins will upload images |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | Recommended for real emails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` | No | Only for real card payments |

The app refuses to start in production if JWT secrets are missing or still contain `change-me`.

Without Cloudinary, uploaded files are written to the service's temporary filesystem and disappear on redeploy. The seeded demo books use external Unsplash images, so the demo works without Cloudinary.

---

## 4. Seed the live database

The seed scripts must run against the Atlas database, not your local one.

### Option A — Render Shell (easiest)

In the Render dashboard, open your service and click **Shell**, then run:

```bash
npm run seed
npm run seed:demo
```

### Option B — Run from your computer

**PowerShell:**

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

`seed:demo` is idempotent and gives you the full catalogue, orders and admin screens used in the README screenshots.

> The demo accounts and passwords are documented publicly in `README.md`. That is acceptable for a demo, but before treating the site as a real store, change or remove those users and set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to private values before running `npm run seed`.

---

## 5. Verify the deployment

1. Open the Render URL, e.g. `https://the-reading-room.onrender.com`.
2. Check `https://<your-url>/api/health` returns `{"success":true,"data":{"status":"ok"}}`.
3. Load the storefront, shop, book detail, cart and checkout pages.
4. Sign in with `reader@bookstore.test` / `Reader@12345` and confirm a test order can be placed with COD/mock payment.
5. Sign in to `/admin` with `admin@bookstore.test` / `Admin@12345` and open Dashboard, Orders and Inventory.
6. Switch language to Arabic and confirm RTL layout.
7. Check the browser console for mixed-content or CORS errors.

The first request after a free service sleeps may take 30–60 seconds. Render shows the service as `Alive` once it responds.

---

## 6. Optional production upgrades

- **Custom domain:** Render supports free custom domains with automatic TLS. Point a CNAME at the Render hostname, then add it under **Settings → Custom Domains**. Update `CLIENT_URL` to the custom domain if you set it explicitly.
- **Cloudinary:** Add the three `CLOUDINARY_*` variables so admin uploads survive redeploys.
- **SMTP:** Add SMTP variables so verification and order emails are delivered instead of logged.
- **Stripe:** Add Stripe keys, set the webhook endpoint to `https://<your-domain>/api/webhooks/stripe`, and set `STRIPE_WEBHOOK_SECRET` to the signing secret.
- **Monitoring:** Point an uptime monitor at `/api/health`.

---

## 7. If you specifically want Vercel or Netlify

Vercel/Netlify can host the **static client** for free, but the Express API needs a serverless wrapper. A future adaptation would require:

1. Adding `serverless-http` and an `api/index.js` (or Netlify function) that exports the Express app.
2. Connecting Mongoose once per warm serverless instance.
3. Setting `CLIENT_URL` to the frontend domain and adding `withCredentials` to the Axios client.
4. Requiring Cloudinary for uploads because serverless filesystems are read-only.
5. Configuring rewrites so `/api/*` reaches the function and all other routes serve `client/dist/index.html`.

That is more moving parts than the single Render service, so Render is the recommended free deployment for this project today.
