# Application Architecture

## High-level

```
Browser (storefront :5173)  ─┐
Browser (admin /admin)      ─┼─► Axios (interceptors) ─► Express REST API (:5000) ─► MongoDB
Mobile                      ─┘                              │
                                                            ├─► Cloudinary (images)
                                                            ├─► SMTP (mail)
                                                            ├─► Stripe (payments)
                                                            └─► FX provider (rates)
```

Both experiences are one React app with decoupled route trees (`/admin/*` uses `AdminLayout`), one Redux store and one shared API client. Authorization is enforced by backend middleware on every protected endpoint — frontend guards only improve UX.

## Backend layers

- `config/` — environment, Mongo connection, third-party clients with safe dev fallbacks.
- `models/` — Mongoose schemas with validation, indexes, timestamps and multilingual field helpers.
- `validators/` — Zod schemas shared conceptually with the client forms.
- `middleware/` — auth (`protect`, `authorize`), errors, validation, upload, rate limits, security.
- `services/` — business logic (orders, inventory, pricing, FX, mail, payments). Controllers stay thin.
- `controllers/` — HTTP glue: parse request → call service → respond with a consistent envelope.
- `routes/` — modular REST routers mounted under `/api`.
- `jobs/`, `templates/`, `tests/` — scheduled maintenance, localized email templates, automated tests.

## Money model (important)

- All authoritative monetary values are stored in **minor units of MAD** (the base currency), e.g. `12990` = 129.90 MAD.
- A displayed currency is chosen client-side for shopping convenience. On checkout the server re-prices the cart in MAD from the database, applies coupons, shipping and tax, then stores:
  - `currency` — currency the customer saw,
  - `exchangeRate` — rate MAD → that currency at order time,
  - `total` — authoritative MAD amount (minor units),
  - `displayTotal` — amount in the customer's currency (minor units).
- Historical orders never change when FX rates change. Frontend-supplied prices are ignored.
- A book's `price` is the chargeable sale price. `compareAtPrice` only drives the savings badge/`discountPercent` display; it is never used to discount `price` a second time.

## Inventory model

Stock changes go through `InventoryService.applyMovement()` which uses an atomic conditional update (`stock >= qty`) and writes an immutable `InventoryMovement` in the same transaction where a replica set is available. Overselling is impossible even under concurrent checkout.

## Internationalization

Static UI strings live in `client/src/locales/{en,fr,ar}/translation.json`. Editable content uses a `LocalizedText` subdocument `{ en, fr, ar }` with a fallback resolver (`ar → fr → en → first non-empty`). Selecting Arabic sets `<html dir="rtl">`, swaps logical CSS properties and mirrors directional icons.

## Caching & performance

- FX rates cached in memory + `ExchangeRate` collection with TTL.
- CMS/homepage cached with short TTL and invalidated on admin writes.
- Mongo indexes on slugs, text fields, order/customer refs and stock thresholds.
- Client route-based code splitting, lazy images, debounced search, skeleton states.

## Deployment notes

- Set NODE_ENV=production, real secrets, Atlas URI, Cloudinary and SMTP.
- Serve `client/dist` through Express (`npm start`) or deploy client to a CDN with `CLIENT_URL` configured.
- Stripe webhook must point to `/api/payments/webhook` with `STRIPE_WEBHOOK_SECRET` set.
