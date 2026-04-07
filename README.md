# SnapShop

SnapShop is a full-stack e-commerce project built for the CIT 7201 / IT 501 Electronic Commerce Technologies project. It now runs as a single Express application that serves the storefront and exposes a backend API backed by Prisma and PostgreSQL.

## Stack

- Express.js for the web server and API
- Prisma ORM for database access
- PostgreSQL as the production database
- Static HTML, CSS, and browser JavaScript for the storefront
- Railway for hosting the web service and database

## Features

- Responsive storefront pages for home, shop, about, FAQ, contact, cart, checkout, payment, and sitemap
- Backend API for products, categories, contact messages, poll votes, and orders
- Prisma schema for products, categories, orders, order items, poll votes, and contact messages
- Seed script to preload the initial SnapShop catalogue
- Frontend integration that fetches products from the API and submits customer actions to the backend
- Memory fallback mode when the database is not connected yet

## Project Structure

- `src/server.js` - server entry point
- `src/app.js` - Express app and static page routing
- `src/routes/api.js` - API endpoints
- `src/services/storeService.js` - product, order, poll, and contact logic
- `src/data/catalog.js` - shared catalogue seed data
- `prisma/schema.prisma` - Prisma data model
- `prisma/seed.js` - database seed script
- `script.js` - frontend logic connected to the API
- `project-report.md` - written answers for Questions 1 and 2

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Install dependencies:

   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" install
   ```

4. Generate Prisma Client:

   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run prisma:generate
   ```

5. Run migrations and seed the database:

   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run db:migrate
   & "C:\Program Files\nodejs\npm.cmd" run db:seed
   ```

6. Start the app:

   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```

## Railway Deployment Notes

- Create a PostgreSQL database service in Railway.
- Add the database connection string to the web service as `DATABASE_URL`.
- Railway can start the app with the `npm start` script from `package.json`.
- Before the app serves live traffic, run Prisma migrations with `npm run db:deploy`.
- Seed the initial catalogue once with `npm run db:seed`.

## Submission Assets

- `project-report.md` contains the written business answers.
- The website frontend is served by Express and can be deployed together with the backend on Railway.
