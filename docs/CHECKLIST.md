# Development Checklist

Legend: ✅ done · 🔄 in progress · ⬜ pending · ⚠️ verified with caveats

## Phase 1 — Foundation
- ✅ Monorepo structure, root workspace scripts, `.env.example`, ignore rules, docs
- ✅ Express app with Helmet, CORS, compression, rate limits, sanitization, central errors
- ✅ MongoDB/Mongoose connection with in-memory test fallback
- ✅ Tailwind premium design tokens, logical RTL utilities, global editorial styles
- ✅ Vite/React entry, BrowserRouter, Redux Provider, HelmetProvider, i18n bootstrap
- ✅ Axios client with access token, session id and rotating refresh interceptor

## Phase 2 — Storefront
- ✅ Header/nav, search autocomplete, language and currency selectors, cart drawer
- ✅ CMS-driven homepage sections, hero, banners, testimonials, newsletter
- ✅ Catalog with filters, search, sort, URL persistence, pagination and grid/list views
- ✅ Book detail with reviews, related books, wishlist and quantity purchase flow
- ✅ Categories, authors, CMS pages, best sellers, new arrivals and offers routes
- ✅ Responsive storefront/footer layouts and not-found page

## Phase 3 — Authentication
- ✅ Register, customer/admin login, logout, verify email, forgot/reset password
- ✅ Refresh-token rotation via HTTP-only cookie with session revocation
- ✅ Separate admin login, backend RBAC middleware and frontend route guards

## Phase 4 — E-commerce
- ✅ Guest/customer cart and wishlist with merge after login
- ✅ Server-side pricing, coupons, shipping, tax and multi-currency snapshots
- ✅ Multi-step checkout with Stripe Checkout, COD and mock development payments
- ✅ Verified Stripe webhook, immutable order snapshots and atomic stock reservation
- ✅ Order history, success page, public tracking and customer account pages

## Phase 5 — Admin Dashboard
- ✅ Analytics dashboard from real DB aggregations with Recharts
- ✅ Books CRUD with uploading, localized fields and bulk actions
- ✅ Categories, authors, publishers, customers, orders and reviews management
- ✅ Coupon management and customer-facing validation

## Phase 6 — Advanced Management
- ✅ Inventory table, movement history, stock adjustments and low-stock views
- ✅ CMS sections/pages/banners/testimonials/newsletter administration
- ✅ Shipping zones, payment transactions/refunds and admin notifications
- ✅ Admin users, roles/permission matrix, audit log, settings and reports/exports

## Phase 7 — i18n & Currency
- ✅ EN/FR/AR translation catalogs and persisted language selector
- ✅ Full Arabic RTL via `<html dir>`, logical CSS utilities and layout mirroring
- ✅ Server-side localized email templates and notifications
- ✅ MAD minor-unit storage, cached FX rates, order snapshots and currency selector

## Phase 8 — Advanced Features
- ✅ React Helmet Async metadata, canonical links and structured data on key pages
- ✅ Server-generated `robots.txt` and `sitemap.xml`
- ✅ Nodemailer templates with development console transport
- ✅ CSV/XLSX/PDF admin exports and report generation
- ✅ Optional Cloudinary upload with local filesystem development fallback

## Phase 9 — Quality Assurance
- ✅ Backend Vitest/Supertest suite: auth, RBAC, catalog, cart, coupons, orders, stock, admin CRUD
- ✅ Frontend Vitest/RTL utility and UI primitive tests
- ✅ Production client build passes with Vite
- ✅ ESLint flat config and workspace lint scripts run successfully
- ✅ Seed script verified against in-memory MongoDB
- ⚠️ Dependency audit reports advisories (mostly transitive dev/build dependencies); review before deployment
- ⚠️ Manual browser/device and accessibility review still recommended

## Phase 10 — Deployment
- ✅ Production build scripts and SPA fallback/static serving from Express
- ✅ Environment-driven external service configuration and graceful local fallbacks
- ✅ Setup commands, demo credentials and API reference documented
- ⬜ Actual hosting/domain deployment, Atlas production cluster and live Stripe/Cloudinary credentials

## Verification commands

```bash
npm install
npm run test --workspace server
npm run test --workspace client
npm run build --workspace client
npm run seed --workspace server
npm run dev
```

On Windows PowerShell, use `npm.cmd` if script execution is disabled. Tests use `mongodb-memory-server`; a local `mongod` is not required.
