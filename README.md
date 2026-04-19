# Shop Manager — Inventory & Billing System (MERN)

A full-stack inventory and billing management system for small shops. Track products, record stock-in (purchases) and stock-out (sales), generate printable invoices, and monitor your shop with a dashboard.

## Features

- **Authentication** — Each shop owner has their own isolated data (JWT-based)
- **Inventory management** — Add/edit/delete products with SKU, category, cost/selling price, stock, low-stock alerts
- **Stock In (Import)** — Record purchases from suppliers; stock increases automatically
- **Billing (Stock Out / Export)** — POS-style interface, cart, tax, discount, multiple payment methods. Creates an invoice and decrements stock atomically
- **Printable invoices** — View past bills; print-friendly layout
- **Transactions log** — Every stock movement (import/export) is recorded and searchable
- **Dashboard** — Today/month revenue, total products, low-stock alerts, last-7-days sales chart, recent bills

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs
- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Axios, Recharts, React Hot Toast

## Project Structure

```
shop-system/
├── backend/
│   ├── config/db.js
│   ├── middleware/    (auth, errorHandler)
│   ├── models/        (User, Product, Transaction, Bill)
│   ├── routes/        (auth, products, transactions, bills, dashboard)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/axios.js
    │   ├── components/Layout.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/     (Login, Register, Dashboard, Products, ProductForm,
    │   │              StockIn, Billing, Bills, BillView, Transactions)
    │   ├── utils/format.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB — local install OR a free MongoDB Atlas cluster

## Setup

### 1. Clone/extract and install

```bash
cd shop-system

# Backend
cd backend
npm install

# Frontend (in a second terminal)
cd ../frontend
npm install
```

### 2. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/shop_system
JWT_SECRET=replace_this_with_a_long_random_string
NODE_ENV=development
```

If using MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

### 3. Run

Open two terminals:

```bash
# Terminal 1 — backend (runs on http://localhost:5000)
cd backend
npm run dev       # uses nodemon; or `npm start` for plain node

# Terminal 2 — frontend (runs on http://localhost:3000)
cd frontend
npm run dev
```

Open http://localhost:3000, register your shop account, and start adding products.

The Vite dev server proxies `/api/*` requests to the backend, so you don't need to configure CORS URLs for development.

## Typical Workflow

1. **Register** your shop on the Register page
2. **Add products** — go to Products → Add Product. Enter name, SKU, cost & selling price, opening stock
3. **Restock** — when you buy from a supplier, go to Stock In, select the product, enter quantity + cost. Stock increases
4. **Sell** — go to New Bill, click products to add to cart, enter customer name if any, set tax/discount, click Create Bill. Stock decreases and an invoice is generated
5. **Review** — use Dashboard for today's snapshot, Bills for invoice history, Transactions for all stock movements

## API Endpoints (quick reference)

| Method | Endpoint                   | Purpose                          |
|--------|----------------------------|----------------------------------|
| POST   | /api/auth/register         | Create account                   |
| POST   | /api/auth/login            | Login, returns JWT               |
| GET    | /api/auth/me               | Current user                     |
| GET    | /api/products              | List (supports ?search, ?category, ?lowStock) |
| POST   | /api/products              | Create                           |
| PUT    | /api/products/:id          | Update                           |
| DELETE | /api/products/:id          | Delete                           |
| GET    | /api/transactions          | List (?type, ?from, ?to)         |
| POST   | /api/transactions          | Create (import/export)           |
| GET    | /api/bills                 | List bills                       |
| GET    | /api/bills/:id             | Bill details                     |
| POST   | /api/bills                 | Create bill (decrements stock)   |
| DELETE | /api/bills/:id             | Delete bill (restores stock)     |
| GET    | /api/dashboard/stats       | Dashboard stats + 7-day chart    |

All `/api/*` routes except auth require `Authorization: Bearer <token>` header.

## Production Build

```bash
# Frontend
cd frontend
npm run build            # outputs to dist/

# Serve the dist/ folder with any static host (Nginx, Vercel, Netlify)
# or serve it from Express by adding static middleware in server.js
```

For the backend, set `NODE_ENV=production` and use a process manager like PM2.

## Notes & Next Steps

- Currency is formatted as INR by default. Change in `frontend/src/utils/format.js`.
- Bill numbers are auto-generated per user in the format `INV-000001`.
- Deleting a bill restores stock automatically.
- The system currently supports one user per shop. To add multiple staff accounts, extend the User model with a `shopId` and a role (owner/cashier).
- No PDF generation is built-in — the BillView page is print-friendly (`Ctrl+P`), which most small shops use. Add a library like `jspdf` if you need programmatic PDFs.

## License

MIT — use freely.
