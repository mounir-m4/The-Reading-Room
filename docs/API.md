# REST API Reference

Base URL: `/api` · JSON only except `/api/payments/webhook` and multipart image upload.

## Conventions

- Successful responses: `{ "success": true, "data": … }`; paginated responses add `{ "meta": { "page", "limit", "total", "totalPages", "hasNext", "hasPrev" } }`.
- Errors: `{ "success": false, "error": { "message", "code?", "details?" } }`.
- Auth: send `Authorization: Bearer <accessToken>`. A rotating refresh token is stored in the HTTP-only `refreshToken` cookie and exchanged at `POST /api/auth/refresh`.
- Money: all persisted amounts are **integer minor units of MAD** (e.g. `12900` = `129.00 MAD`). Orders additionally store display-currency snapshots; never recalculate historical orders from live FX rates.
- Guest identity: send `x-session-id` on cart/wishlist requests. The client generates and stores one automatically.
- Localized fields are objects such as `{ "en": "…", "fr": "…", "ar": "…" }`.

## Public endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe for hosting platforms; returns `{ success: true, data: { status: "ok" } }` |
| POST | `/auth/register` | Create customer account |
| POST | `/auth/login` | Customer login |
| POST | `/auth/admin/login` | Admin login |
| POST | `/auth/refresh` | Rotate refresh cookie, issue new access token |
| POST | `/auth/logout` | Revoke refresh token/session |
| POST | `/auth/verify-email` | Verify email token |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Set new password |
| GET | `/books` | Published catalog with filters/search/sort/pagination |
| GET | `/books/search` | Typeahead across books, authors, categories |
| GET | `/books/:slug` | Book detail, reviews, related books |
| GET | `/categories` · `/categories/:slug` | Categories and their books |
| GET | `/authors` · `/authors/:slug` | Authors and their books |
| GET | `/publishers` | Publishers |
| GET | `/cms/homepage` | CMS-driven homepage payload (`lang`, `currency`) |
| GET | `/cms/pages` · `/cms/pages/:key` | Active CMS pages |
| GET | `/cms/banners` · `/cms/testimonials` | Active marketing content |
| GET | `/shipping/zones` | Active shipping zones |
| GET | `/settings` | Public store settings |
| GET | `/payments/config` | Enabled payment methods |
| POST | `/newsletter` | Subscribe to newsletter |
| GET | `/cart` · `/wishlist` | Guest/customer cart and wishlist |
| POST | `/cart` · `PUT /cart/:bookId` · `DELETE /cart/:bookId` · `DELETE /cart` | Cart mutations |
| POST | `/cart/coupon` | Validate/apply coupon to cart |
| POST | `/cart/merge` | Merge guest cart after login (auth) |
| POST | `/wishlist/:bookId` | Toggle wishlist item |
| POST | `/orders/preview` | Server-side cart totals preview |
| POST | `/orders` | Place order (stock reserved atomically) |
| GET | `/orders/:id` | Order by id (guest requires `?email=`) |
| GET | `/orders/track/:number` | Public tracking timeline |
| GET | `/reviews/book/:bookId` | Approved reviews |
| POST | `/reviews/:id/helpful` | Increment helpful counter |

## Customer (access token required)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/me` | Current customer or admin identity |
| PUT | `/auth/profile` | Update profile |
| POST | `/auth/change-password` | Change password |
| GET | `/orders/mine` | Customer order history |
| GET | `/reviews/mine` | Customer reviews |

## Payments

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/payments/checkout` | Create Stripe Checkout session for an order |
| POST | `/payments/mock` | Mark a COD/mock order paid in development |
| POST | `/payments/webhook` | Stripe webhook (raw body + signature verification) |

## Admin (admin access token + RBAC)

| Method | Path | Required permission |
| --- | --- | --- |
| GET | `/admin/dashboard` | `analytics.view` |
| GET | `/admin/reports` | `analytics.view` |
| POST | `/admin/export/csv` · `/xlsx` · `/pdf` | `reports.export` |
| POST | `/admin/upload` | any admin (image → `{url, publicId}`) |
| GET/POST | `/admin/books` | `books.view` / `books.create` |
| GET/PUT/DELETE | `/admin/books/:id` | `books.view` / `books.edit` / `books.delete` |
| POST | `/admin/books/bulk` | `books.edit` |
| POST/PUT/DELETE | `/admin/categories`, `/admin/authors`, `/admin/publishers` | `categories.manage`, `authors.manage`, `books.view` |
| GET/PUT | `/admin/orders`, `/admin/orders/:id` | `orders.view` / `orders.manage` |
| POST | `/admin/orders/:id/cancel` | `orders.manage` |
| GET/PUT | `/admin/customers`, `/admin/customers/:id` | `customers.view` / `customers.manage` |
| GET | `/admin/inventory` · `/admin/inventory/movements` · `/admin/inventory/low-stock` | `inventory.view` |
| POST | `/admin/inventory/adjustments` | `inventory.manage` |
| GET/PUT/DELETE | `/admin/reviews` | `reviews.manage` |
| GET/POST/PUT/DELETE | `/admin/coupons` | `coupons.manage` |
| GET/PUT | `/admin/cms/sections` · `/admin/cms/homepage` | `cms.manage` |
| GET/POST/PUT/DELETE | `/admin/cms/pages` · `/banners` · `/testimonials` | `cms.manage` |
| GET | `/admin/newsletter` | `cms.manage` |
| GET/POST/PUT/DELETE | `/admin/shipping/zones` | `shipping.manage` |
| GET | `/admin/payments` | `payments.manage` |
| POST | `/admin/payments/:id/refund` | `payments.manage` |
| GET/POST/PUT/DELETE | `/admin/admins` | `users.manage` |
| GET/PUT | `/admin/roles` | `users.manage` |
| GET | `/admin/audit` | `users.manage` |
| GET/PUT/POST | `/admin/notifications`, `/admin/notifications/read-all` | any admin |
| GET/PUT | `/settings` · `/admin/settings` | `settings.manage` |

## Filtering common query parameters

- Pagination: `page`, `limit` (default 20, max 100).
- Books: `q`, `category`, `author`, `publisher`, `language`, `minPrice`, `maxPrice`, `rating`, `inStock`, `discounted`, `sort`, `currency`, `ids`, `fields`.
- Admin books: `q`, `author`, `publisher`, `language`, `isPublished`, `featured`, `category`, `lowStock`, `sortBy`, `sortDir`.
- Orders: `q`, `status`, `paymentStatus`, `paymentMethod`, `from`, `to`.
- Inventory: `q`, `low`; movements: `book`.
- Reviews: `status`, `book`, `reported`.
- Reports/analytics: `type` (`sales|inventory|customers|coupons`), `period` (`today|7d|30d|90d|year`), `from`, `to`.
