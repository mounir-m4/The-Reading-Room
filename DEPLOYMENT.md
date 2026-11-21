# Deploying The Reading Room

The live app is hosted on **Vercel** with **MongoDB Atlas**.

## Architecture

| Layer | Platform | Notes |
| --- | --- | --- |
| Static client + API | Vercel | `vercel.json` builds the Vite client and rewrites API/SEO routes to `api/index.js`. |
| Database | MongoDB Atlas | Free shared M0 cluster. |

> **Vercel Hobby** is free and card-free, but its terms are for personal, non-commercial use.

Free-tier caveats:

- Vercel Functions have a read-only filesystem. Admin image uploads need Cloudinary; the seeded demo books use external Unsplash images and work without it.
- Vercel Hobby has its own usage limits and is not intended for commercial traffic.
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

## 2. Deploy on Vercel

The repository includes `vercel.json` and the shared Express function in `api/index.js`. Vercel builds the Vite client into `client/dist`, serves its static files, rewrites API and SEO requests to the Express function, and falls back to `index.html` for SPA routes.

1. Import `mounir-m4/The-Reading-Room` into Vercel and keep the project root at the repository root.
2. Use the Hobby plan for personal testing.
3. In **Project Settings → Environment Variables**, set these for **Production** (and Preview if you use preview deployments):
   - `MONGO_URI` — the Atlas connection string from step 1
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — two distinct, long random values
   - `CLIENT_URL` — optional; defaults to the Vercel URL. Set it when using a custom domain.
4. Deploy. Vercel reads the build command, output directory and rewrites from `vercel.json`.
5. Verify `/api/health`, then check the storefront and `/api/books`.

Do not paste secrets into chat or commit them to GitHub. Enter them directly in Vercel's Environment Variables settings. Seed the Atlas database from your local shell using the instructions below if the selected database is empty. Optional payment, email and image-upload integrations require their corresponding credentials; keep real payments disabled for a test deployment.

---

## 3. Environment variables

| Variable | Required | Value |
| --- | --- | --- |
| `MONGO_URI` | Yes | Atlas SRV connection string |
| `MONGODB_DB` | No | Database containing the app data; defaults to `the_reading_room` |
| `JWT_ACCESS_SECRET` | Yes | Long random value, different from the refresh secret |
| `JWT_REFRESH_SECRET` | Yes | Long random value, different from the access secret |
| `CLIENT_URL` | No | Defaults to `VERCEL_URL`; set your custom domain if needed |
| `MAIL_FROM` | No | `The Reading Room <hello@thereadingroom.test>` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Recommended | Enables persistent admin image uploads |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | Enables real email delivery |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` | No | Only for real card payments |

Generate each JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The app refuses to start in production if JWT secrets are missing or still contain `change-me`. Vercel sets `VERCEL_ENV`, so you do not need to add `NODE_ENV` there.

---

## 4. Seed the live database

Run the seed scripts locally against the Atlas database.

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

`seed:demo` is idempotent and creates the full catalogue, orders and admin screens used in the README screenshots.

> The demo credentials are public in `README.md`. That is acceptable for a demo, but before treating the site as a real store, change/remove those users and set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to private values before running `npm run seed`.

---

## 5. Verify the deployment

1. Open the live Vercel URL, e.g. <https://the-reading-room-pi-umber.vercel.app/>.
2. Check `/api/health` returns `{"success":true,"data":{"status":"ok"}}`.
3. Load the storefront, `/shop`, a book detail page, `/cart` and `/checkout`.
4. Sign in with `reader@bookstore.test` / `Reader@12345` and place a test COD/mock order.
5. Sign in at `/admin` with `admin@bookstore.test` / `Admin@12345` and open Dashboard, Orders and Inventory.
6. Switch language to Arabic and confirm RTL layout.
7. Open the browser console and confirm no CORS, mixed-content or 404 errors.

If the first request is slow, the serverless function and Atlas cluster are waking up.

---

## 6. Optional production upgrades

- **Custom domain:** Add it in Vercel's Domains settings, then set `CLIENT_URL` to that domain.
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

You can also start the full local app and check the API:

```powershell
npm.cmd start
```

```text
GET http://localhost:5000/api/health          -> {"success":true,"data":{"status":"ok"}}
GET http://localhost:5000/api/books?limit=1   -> 200
```

### Local DNS note

If seeding or startup fails with `querySrv EREFUSED _mongodb._tcp.<cluster>.mongodb.net`, your local router/ISP DNS is refusing external SRV queries. The root npm scripts load `scripts/dns-preload.mjs`, which points Node at public resolvers automatically. This only affects your local machine; deployed functions use their platform's DNS.

To opt out and use your system DNS, set:

```powershell
$env:NODE_DNS_RESOLVERS = "system"
```

Alternatively, configure your router or Windows network adapter to use `8.8.8.8` / `1.1.1.1`.
