# OpsDesk AI – Backend

**Beyond Tickets. Towards Intelligent Operations.**  
Team: **VOYAGEX**

MERN backend MVP for intelligent travel operations & support (Express + MongoDB).

## Requirements

- Node.js 20+
- MongoDB (local or Atlas) via `MONGODB_URI`

## Setup

```bash
cd backend
cp .env.example .env
# edit .env — set MONGODB_URI and JWT_SECRET
npm install
npm run seed
npm run dev
```

- API: `http://localhost:5000/api/v1`
- Health: `GET /health`
- Swagger: `http://localhost:5000/api-docs`

## Environment

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | Yes | Local or Atlas connection string |
| `JWT_SECRET` | Yes | Long random string |
| `PORT` | No | Default `5000` |
| `JWT_EXPIRES_IN` | No | Default `8h` |
| `SEED_*_PASSWORD` | No | Override seed passwords |

## Dev credentials (NEVER use in production)

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@voyagex.demo` | `Admin@12345` |
| MANAGER | `manager@voyagex.demo` | `Manager@12345` |
| AGENT | `agent@voyagex.demo` | `Agent@12345` |
| Other org ADMIN | `admin@acme.demo` | `Admin@12345` |

## Scripts

- `npm run dev` – nodemon
- `npm start` – production start
- `npm run seed` – idempotent demo data (blocked if `NODE_ENV=production`)
- `npm test` – smoke tests (mongodb-memory-server)

## Known MVP limitations

- Logout is **stateless** (client discards JWT; token valid until expiry).
- SLA clock does **not** pause on `WAITING_FOR_SUPPLIER`.
- Routing and related-ticket matching are **rule-based**, not ML/semantic AI.
- Supplier draft approval only updates status — **nothing is sent externally**.
