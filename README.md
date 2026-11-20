<div align="center">
  <img src="client/public/logo.svg" alt="The Reading Room" width="380" />

  <p>
    <img src="https://img.shields.io/badge/MERN-Stack-613483?logo=mongodb&logoColor=white" alt="MERN stack" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
    <img src="https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node 18+" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/demo-data-included-8B5CF6" alt="Demo data included" />
  </p>

  <p><strong>A curated bookstore with a beautiful storefront and a complete, role-protected admin dashboard.</strong></p>
</div>

## Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Demo data and accounts](#demo-data-and-accounts)
- [Running the app](#running-the-app)
- [API overview](#api-overview)
- [Design and security decisions](#design-and-security-decisions)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

---

## Overview

**The Reading Room** is a full-stack MERN application for selling books online. It ships with:

- a public storefront (catalogue, search, filters, book details, cart, checkout, order tracking, reviews);
- a customer account area (profile, addresses, orders, wishlist, recently viewed, reviews);
- a complete admin dashboard (catalogue, orders, customers, inventory, coupons, CMS, shipping, payments, RBAC, audit, reports);
- one REST API and one MongoDB database shared by both clients;
- English, French and Arabic UI with full RTL layout support;
- MAD minor-unit pricing with server-side totals and immutable order snapshots.

External services are optional in development. Without them the app uses local uploads, console email, COD/mock payments and static exchange rates. Production should configure the real services.

---

## Screenshots

All screenshots below are captured from the running application with the generated demo dataset.

### Storefront

| Home | Catalogue |
| --- | --- |
| ![The Reading Room home page](docs/images/storefront-home.jpg) | ![Book catalogue with filters](docs/images/storefront-shop.jpg) |

| Book detail | Cart |
| --- | --- |
| ![Book detail page](docs/images/storefront-book-detail.jpg) | ![Shopping cart](docs/images/storefront-cart.jpg) |

### Admin dashboard

| Overview | Books |
| --- | --- |
| ![Admin dashboard](docs/images/admin-dashboard.jpg) | ![Admin books panel](docs/images/admin-books.jpg) |

| Orders | Inventory |
| --- | --- |
| ![Admin orders panel](docs/images/admin-orders.jpg) | ![Admin inventory panel](docs/images/admin-inventory.jpg) |

| Reports |
| --- |
| ![Admin reports panel](docs/images/admin-reports.jpg) |

---

## Features

### Storefront

- Responsive editorial design with a reusable SVG brand mark and wordmark.
- CMS-driven home sections, banners and testimonials.
- Catalogue search, category/author/publisher filtering, sorting, sale and new-arrival views.
- Book detail pages with reviews, related titles, stock state and wishlist actions.
- Guest and authenticated carts with coupon support.
- Multi-step checkout with shipping zones, COD/mock/Stripe payment methods and server-calculated totals.
- Order confirmation, order history and public order tracking.
- Customer profile, saved addresses, wishlist, recently viewed and submitted reviews.
- EN/FR/AR translations and automatic RTL layout for Arabic.

### Admin

- Dashboard KPIs and charts generated from real database data.
- Full CRUD for books, categories, authors and publishers.
- Order management with status workflow, refunds and immutable status logs.
- Customer and administrator management with roles and granular permissions.
- Inventory table with low/out-of-stock alerts and an append-only movement log.
- Review moderation, coupon management, CMS editing, shipping zones and payment transactions.
- Audit log, notifications, store settings, reports and CSV/XLSX exports.

### Engineering

- Central `InventoryService.applyMovement()` for every stock change with conditional atomic updates.
- Integer MAD minor units as the source of truth; display currencies are derived with cached rates.
- Server-side order pricing; clients never submit prices, stock or permissions.
- JWT access tokens plus rotating refresh cookies, bcrypt password hashing and RBAC middleware.
- Helmet, rate limiting, Zod validation and NoSQL-injection sanitization.
- Verified Stripe webhook signatures for real payment mode.

---

## Architecture

```mermaid
graph LR
  Browser[Storefront / Admin UI] -->|REST + JWT| API[Express REST API]
  API --> Services[Domain services<br/>orders · inventory · coupons · FX]
  Services --> DB[(MongoDB / Atlas)]
  API --> Files[Local uploads<br/>or Cloudinary]
  API --> Mail[Console mail<br/>or SMTP]
  API --> Pay[Mock / COD<br/>or Stripe]
  API --> CMS[CMS + settings<br/>in MongoDB]
```

The monorepo keeps the two client surfaces separate while sharing one API:

```text
the-reading-room/
├── client/   Vite + React + Tailwind + Redux Toolkit + i18next
│   ├── src/components/common/BrandLogo.jsx   unified brand mark
│   ├── src/pages/storefront/                 public + account pages
│   ├── src/pages/admin/                      admin panels
│   └── public/                               logo, favicon, placeholders
├── server/   Express + Mongoose
│   ├── src/controllers/                      HTTP layer
│   ├── src/services/                         pricing, stock, coupons, mail, FX
│   ├── src/models/                           MongoDB schemas
│   ├── src/middleware/                       auth, RBAC, security, upload
│   └── src/scripts/                          seed + demo generators
├── docs/     architecture, API, checklist, demo data, screenshots
└── .env.example
```

---

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 18, Vite 5, Tailwind CSS, Framer Motion, React Router |
| State | Redux Toolkit, React Hook Form, Zod |
| Internationalization | i18next, English/French/Arabic resources, RTL layout |
| API | Node.js, Express, Zod validators, cookie-parser, Helmet |
| Database | MongoDB 6+, Mongoose 8, optional MongoDB Atlas |
| Auth | JWT access tokens, rotating refresh cookies, bcryptjs, RBAC |
| Payments | COD, mock gateway, Stripe with signed webhooks |
| Media/email | Cloudinary with local fallback, Nodemailer with console fallback |
| Reports | Recharts, XLSX, PDFKit |
| Tests | Vitest, Supertest, mongodb-memory-server |
| Tooling | ESLint, Prettier, concurrently |

---

## Quick start

### Prerequisites

- Node.js **18+** and npm
- MongoDB running locally **or** a MongoDB Atlas cluster
- Git (for cloning and pushing)

### 1. Install

```bash
git clone <your-repository-url>
cd the-reading-room
cp .env.example .env
npm install
```

On Windows, if `npm` is blocked by PowerShell script policy, use `npm.cmd` instead, or run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 2. Configure `.env`

Generate two independent secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set at minimum:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/the_reading_room
JWT_ACCESS_SECRET=<first-random-string>
JWT_REFRESH_SECRET=<second-random-string>
```

For MongoDB Atlas, use the SRV connection string, create a database user, and allow your current IP in **Network Access**:

```dotenv
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/the_reading_room?retryWrites=true&w=majority
```

### 3. Seed the database

```bash
npm run seed          # base admin, settings, catalogue, CMS
npm run seed:demo     # full realistic dataset for every screen
```

`seed:demo` is idempotent. It removes only records it generated and preserves the base admin, base coupon and manually created data.

### 4. Run

```bash
npm run dev
```

Open:

- Storefront: <http://localhost:5173>
- Admin: <http://localhost:5173/admin>
- API: <http://localhost:5000/api>

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `production` or `test`. |
| `PORT` | No | API/production server port. Defaults to `5000`. |
| `CLIENT_URL` | No | Allowed CORS origin. Defaults to `http://localhost:5173`. |
| `MONGO_URI` | Yes | Local MongoDB URI or Atlas SRV URI. |
| `USE_MEMORY_DB` | No | `true` uses `mongodb-memory-server`; used by tests. |
| `JWT_ACCESS_SECRET` | Yes | Long random secret for 15-minute access tokens. |
| `JWT_REFRESH_SECRET` | Yes | Separate long random secret for refresh cookies. |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | No | Token lifetimes. Defaults `15m` / `7d`. |
| `CLOUDINARY_*` | No | Enables cloud uploads; otherwise files are written to `uploads/`. |
| `SMTP_*`, `MAIL_FROM` | No | Enables real email; otherwise mail is logged to the console. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` | No | Enables Stripe; otherwise mock/COD work in development. |
| `EXCHANGE_RATE_PROVIDER`, `EXCHANGE_RATE_API_KEY` | No | Enables live FX; otherwise static rates are cached. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | No | Credentials created by `npm run seed`. |

Production refuses to start if JWT secrets are missing or still contain `change-me`.

---

## Demo data and accounts

After running both seed commands the database contains 30 books, 14 categories, 24 authors, 13 customers, 5 admins, 48 orders, 48 payment records, 90 inventory movements, 34 reviews, 7 coupons, audit logs, notifications and CMS content.

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@bookstore.test` | `Admin@12345` |
| Customer | `reader@bookstore.test` | `Reader@12345` |
| Administrator | `manager.demo@bookstore.test` | `Demo@12345` |
| Content Manager | `content.demo@bookstore.test` | `Demo@12345` |
| Inventory Manager | `inventory.demo@bookstore.test` | `Demo@12345` |
| Marketing Manager | `marketing.demo@bookstore.test` | `Demo@12345` |

Demo login addresses use the reserved `.test` domain on purpose. Store contact details use `hello@thereadingroom.test`.

Useful demo coupons: `SAVE10`, `WELCOME15`, `FREESHIP`, `RAMADAN25`, `SPRING10`, `VIP20`, `BOOKS500`.

Demo orders use numbers `DEMO-2026-0001` through `DEMO-2026-0048`, so they can be opened in `/track-order` or found in admin order search. See [docs/DEMO_DATA.md](docs/DEMO_DATA.md) for the complete dataset reference.

---

## Running the app

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API and Vite client together with hot reload. |
| `npm run dev:server` | API only on port `5000`. |
| `npm run dev:client` | Vite only on port `5173`. |
| `npm run build` | Build the production client into `client/dist`. |
| `npm start` | Serve the built client and API from one process on port `5000`. |
| `npm run seed` | Create base admin, settings, catalogue and CMS pages. |
| `npm run seed:demo` | Generate the full demo dataset. |
| `npm test` | Run backend and frontend test suites. |
| `npm run lint` | Lint both workspaces. |
| `npm run format` | Format supported source files with Prettier. |

For a production-style local run:

```bash
npm run build
npm start
# open http://localhost:5000
```

Hard-refresh the browser (`Ctrl+F5`) after rebuilding if a stale bundle is served from cache.

---

## API overview

The API is mounted under `/api` and returns `{ success, data, meta? }` envelopes.

| Area | Representative endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `/api/auth/login`, `/api/auth/admin/login`, `POST /api/auth/refresh`, `GET /api/auth/me` |
| Catalogue | `GET /api/books`, `/api/books/:slug`, `/api/categories`, `/api/authors`, `/api/publishers` |
| Commerce | `GET/POST /api/cart`, `/api/cart/coupon`, `POST /api/orders/preview`, `POST /api/orders`, `GET /api/orders/mine`, `/api/orders/track/:number` |
| Content | `GET /api/cms/homepage`, `/api/settings`, `GET /api/pages/:key`, `GET /api/reviews/mine` |
| Admin | `/api/admin/dashboard`, `/api/admin/books`, `/api/admin/orders`, `/api/admin/inventory`, `/api/admin/reviews`, `/api/admin/coupons`, `/api/admin/cms/*`, `/api/admin/users`, `/api/admin/reports` |
| Webhooks | `POST /api/payments/webhook` — raw payload signature verified before any state change |

Full request/response details are in [docs/API.md](docs/API.md).

---

## Design and security decisions

- **Money:** `price`, `subtotal`, `shipping`, `discount` and `total` are integer MAD minor units. `compareAtPrice` only drives savings badges and is never subtracted twice.
- **Pricing:** the cart preview and order service recalculate every amount from database prices and active coupons. Client-supplied totals are ignored.
- **Orders:** order items snapshot localized titles, author, ISBN, unit price and line total. Status transitions are appended to `statusLog` and existing orders are never mutated by price changes.
- **Inventory:** every stock change goes through `InventoryService.applyMovement()` with a conditional atomic update and an immutable `InventoryMovement` record.
- **Authorization:** frontend route guards are convenience only; every admin endpoint validates the admin role and permission on the server.
- **Cookies:** refresh tokens are `HttpOnly`, `SameSite=Lax` locally, `SameSite=None; Secure` in production, and rotate on refresh.
- **Auditability:** privileged actions write audit logs with actor, module, target and metadata.
- **Payments:** Stripe webhooks verify signatures, are idempotent, and are the only path that flips paid state in real mode.
- **i18n:** Arabic sets `dir="rtl"` at the document level; Tailwind logical properties keep layout aligned in both directions.

---

## Testing and quality checks

```bash
npm test
npm run lint
npm run build
```

Tests use `mongodb-memory-server`, so no external database is required. Coverage includes authentication, RBAC, catalogue CRUD, cart/coupon math, order creation, stock movements, refund handling and Stripe webhook verification.

The production Vite build reports a non-fatal chunk-size warning for the Recharts `charts` chunk. Route-level code splitting can address it if further optimization is needed.

---

## Deployment notes

The recommended free deployment is **Netlify + MongoDB Atlas**. Netlify is free, does not require a credit card, allows commercial projects, and serves the built client plus the Express API from one HTTPS domain via `netlify/functions/api.js`. Refresh cookies and CORS work without extra configuration.

1. Create a free MongoDB Atlas cluster and copy its SRV connection string.
2. Import this repository into Netlify. `netlify.toml` sets the build command, publish directory, functions directory and Node version.
3. Add `NODE_ENV=production`, `MONGO_URI` and two distinct JWT secrets in Netlify's environment variables.
4. Run `npm run seed` and `npm run seed:demo` locally against the Atlas URI to populate the live database.
5. Open the Netlify URL and verify the storefront, checkout, admin login and Arabic RTL.
6. For real payments/email/uploads, add Stripe, SMTP and Cloudinary credentials and configure the Stripe webhook at `https://<domain>/api/payments/webhook`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact Atlas/Netlify steps, the full environment-variable table, why Render/Vercel were not chosen and post-deploy checks. Do not commit `.env`, uploads or build output; they are excluded by `.gitignore`.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm.ps1 cannot be loaded` on Windows | Use `npm.cmd`, or set `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| Port `5000` or `5173` already in use | Stop the existing process or change `PORT`/Vite port. |
| Blank admin page after sign-in | Check the browser console for a stale token, clear `localStorage`, and sign in again. |
| Old branding after rebuild | Hard-refresh (`Ctrl+F5`) or clear the site cache; confirm `npm run build` completed. |
| Atlas connection fails | Verify the SRV URI, database user password and **Network Access** IP allowlist. |
| Images missing in development | Uploads fall back to `uploads/`; ensure the server process can write to that directory. |
| Demo data looks unchanged | Rerun `npm run seed:demo`; it upserts brand settings and replaces generated records. |

---

## Documentation

- [Deployment guide](DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Production checklist](docs/CHECKLIST.md)
- [Demo dataset](docs/DEMO_DATA.md)

---

<div align="center">
  <p>Built as a production-oriented MERN reference application.</p>
  <img src="client/public/logo-mark.svg" alt="The Reading Room mark" width="48" />
</div>
