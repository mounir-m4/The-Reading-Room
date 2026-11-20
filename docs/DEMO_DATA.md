# The Reading Room demo dataset

`npm run seed:demo` fills the database with realistic data so every storefront
screen and admin panel has something meaningful to display. It is safe to run
more than once: generated records are removed and recreated, while the base
records created by `npm run seed` are preserved.

## Run it

```bash
npm run seed          # first time only, creates the base admin/settings
npm run seed:demo
npm run dev
```

The server must be able to reach the database configured by `MONGO_URI` in the
root `.env`. With `USE_MEMORY_DB=false`, this writes to your MongoDB/Atlas
database.

## What is generated

| Area | Amount | Where to see it |
| --- | ---: | --- |
| Books | 30 total (18 extra) | `/shop`, `/admin/books` |
| Categories | 14 total | `/categories`, `/admin/categories` |
| Authors | 24 total | `/authors`, `/admin/authors` |
| Publishers | 9 total | `/admin/publishers` |
| Customers | 13 | `/admin/customers` |
| Admins | 5 | `/admin/users` |
| Orders | 48 | `/account/orders`, `/admin/orders` |
| Payment transactions | 48 | `/admin/payments` |
| Inventory movements | 90 | `/admin/inventory` (Movements tab) |
| Reviews | 34 | `/admin/reviews` |
| Coupons | 7 total | `/admin/coupons` |
| Audit logs | 26 | `/admin/audit` |
| Notifications | 12 | `/admin/notifications` |
| CMS pages / banners / testimonials | 10 / 4 / 8 | `/admin/cms`, `/pages/:key` |
| Shipping zones | 7 total | `/admin/shipping`, checkout |
| Newsletter subscribers | 12 | `/admin/cms` |

The dashboard (`/admin`) and reports (`/admin/reports`) use the generated
orders, so revenue charts, status breakdowns, top books/authors/categories and
customer growth are all populated.

## Logins

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@bookstore.test` | `Admin@12345` |
| Customer | `reader@bookstore.test` | `Reader@12345` |
| Administrator | `manager.demo@bookstore.test` | `Demo@12345` |
| Content Manager | `content.demo@bookstore.test` | `Demo@12345` |
| Inventory Manager | `inventory.demo@bookstore.test` | `Demo@12345` |
| Marketing Manager | `marketing.demo@bookstore.test` | `Demo@12345` |

The customer `reader@bookstore.test` has paid and pending orders, a saved
address, a populated cart, wishlist and recently viewed books.

## Coupons

| Code | State |
| --- | --- |
| `SAVE10` | Base coupon, 10% off |
| `WELCOME15` | Active, 15% off, capped at 50 MAD |
| `FREESHIP` | Active, fixed 30 MAD delivery credit |
| `RAMADAN25` | Expired |
| `SPRING10` | Scheduled |
| `VIP20` | Active, restricted to selected customers |
| `BOOKS500` | Inactive |

## Useful demo routes

```text
/books/the-glass-kingdom
/categories/fantasy
/authors/elena-rossi
/pages/gift-cards
/account/orders
/admin/orders
/admin/inventory
/admin/reviews
/admin/reports
/admin/audit
```

Order numbers follow the pattern `DEMO-2026-0001` … `DEMO-2026-0048`, so a
generated order can be opened directly with `/track-order` or the admin order
search.

## Idempotency

Rerunning the command deletes only records it created:

- orders `DEMO-*`
- payments `DEMO-TX-*`
- inventory movements `DEMO-INV-*`
- audit logs with `details.demo = true`
- notifications titled `Demo - *`
- the coupon codes and demo users/admins listed above

Base seeded data and anything you create manually with other identifiers are
left intact.
