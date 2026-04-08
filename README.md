# SnapShop

SnapShop is a full-stack e-commerce marketplace built for the CIT 7201 / IT 501 Electronic Commerce Technologies project. It runs as a single Express application that serves the storefront and exposes a backend API backed by Prisma and PostgreSQL, with Pesapal payment integration and Cloudinary image hosting.

**Live site:** <https://snapshop.divinefishers.com/>

## Stack

- **Backend:** Express.js, Prisma ORM, PostgreSQL
- **Frontend:** Static HTML, CSS, Vanilla JavaScript
- **Payments:** Pesapal API 3.0 (Mobile Money & Card)
- **Image Storage:** Cloudinary (persistent cloud hosting)
- **Hosting:** Railway (web service + database)

## Features

- Responsive storefront with home, shop, product detail, cart, checkout, payment, about, FAQ, contact, and sitemap pages
- Backend API for products, categories, contact messages, poll votes, and orders
- JWT authentication with role-based access (Admin, Vendor, Customer)
- **Vendor dashboard** — store creation, product CRUD, multi-image upload via Cloudinary, order management
- **Customer dashboard** — order history, address management, server-side cart persistence
- **Admin dashboard** — vendor approval, user management, product oversight, order & payment tracking
- **Pesapal 3.0 integration** — mobile money & card payments with IPN callback support
- **Cloudinary integration** — persistent product image storage that survives Railway redeploys
- Cart merge on login/register (local cart syncs with server)
- Category navigation from homepage to filtered shop view
- Wishlist functionality
- Memory fallback mode when the database is not connected

## Project Structure

```
├── index.html, shop.html, cart.html, ...   # Storefront pages
├── script.js                                # Frontend logic
├── auth-ui.js                               # Auth & dashboard rendering
├── styles.css                               # Design system
├── assets/                                  # Static assets & placeholders
├── src/
│   ├── server.js                            # Server entry point
│   ├── app.js                               # Express app & static routing
│   ├── routes/
│   │   ├── api.js                           # Public catalogue, contact, poll endpoints
│   │   ├── auth.js                          # JWT login, register, current-user
│   │   ├── vendor.js                        # Vendor store & product management
│   │   ├── customer.js                      # Customer cart, addresses, orders
│   │   └── admin.js                         # Admin approval & management
│   ├── services/
│   │   └── storeService.js                  # Core business logic
│   ├── lib/
│   │   ├── prisma.js                        # Prisma client
│   │   └── cloudinary.js                    # Cloudinary upload/delete
│   ├── data/catalog.js                      # Seed catalogue data
│   ├── store/memoryStore.js                 # In-memory fallback store
│   ├── middleware/auth.js                   # JWT auth middleware
│   └── utils/                              # Auth, orders, slug, validation helpers
├── prisma/
│   ├── schema.prisma                        # Data model
│   ├── seed.js                              # Database seed script
│   └── migrations/                          # Migration history
└── project-report.md                        # Written answers (Q1 & Q2)
```

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Set `JWT_SECRET` to a strong secret value.
4. Set up **Pesapal** credentials (sandbox or production):
   - `PESAPAL_CONSUMER_KEY`
   - `PESAPAL_CONSUMER_SECRET`
   - `PESAPAL_API_URL`
5. Set up **Cloudinary** credentials (free tier at [cloudinary.com](https://cloudinary.com)):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
6. Install dependencies:

   ```bash
   npm install
   ```

7. Generate Prisma Client:

   ```bash
   npm run prisma:generate
   ```

8. Run migrations and seed the database:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

9. Start the app:

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000`.

## Railway Deployment

1. Create a PostgreSQL database service in Railway.
2. Add the following environment variables to the web service:
   - `DATABASE_URL` — private Railway Postgres connection string
   - `JWT_SECRET` — a strong secret value
   - `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_API_URL`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Railway starts the app with `npm start`.
4. Run Prisma migrations: `npm run db:deploy`.
5. Seed the catalogue: `npm run db:seed`.
6. From your local machine, use the public Railway proxy URL as `DATABASE_PUBLIC_URL`.

## Demo Accounts

The seed script creates demo users for testing:

| Role     | Email                  | Password       |
|----------|------------------------|----------------|
| Admin    | admin@snapshop.ug      | Admin123!      |
| Vendor   | vendor@snapshop.ug     | Vendor123!     |
| Customer | customer@snapshop.ug   | Customer123!   |

## Environment Variables

| Variable                  | Required | Description                              |
|---------------------------|----------|------------------------------------------|
| `PORT`                    | No       | Server port (default: 3000)              |
| `NODE_ENV`                | No       | `development` or `production`            |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string             |
| `DATABASE_PUBLIC_URL`     | No       | Public Railway proxy URL (local dev)     |
| `JWT_SECRET`              | Yes      | Secret for signing JWTs                  |
| `PESAPAL_CONSUMER_KEY`    | Yes      | Pesapal API consumer key                 |
| `PESAPAL_CONSUMER_SECRET` | Yes      | Pesapal API consumer secret              |
| `PESAPAL_API_URL`         | Yes      | Pesapal API base URL                     |
| `CLOUDINARY_CLOUD_NAME`   | No*      | Cloudinary cloud name                    |
| `CLOUDINARY_API_KEY`      | No*      | Cloudinary API key                       |
| `CLOUDINARY_API_SECRET`   | No*      | Cloudinary API secret                    |

\* Cloudinary is optional — without it, images are stored on local disk (lost on Railway redeploy).

## License

This project was created for academic purposes (CIT 7201 / IT 501).
