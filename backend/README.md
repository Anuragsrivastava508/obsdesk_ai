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
# edit .env — set MONGODB_URI, JWT_SECRET, CORS_ORIGINS, and unique seed passwords
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
| `JWT_SECRET` | Yes | Production requires at least 32 characters of high-entropy randomness |
| `PORT` | No | Default `5000` |
| `JWT_EXPIRES_IN` | No | Default `8h` |
| `CORS_ORIGINS` | Production | Comma-separated HTTPS frontend origins; local development defaults to localhost ports `5173` and `4173` |
| `SEED_*_PASSWORD` | Seed only | Set unique local passwords before seeding; never use demo/default passwords in production |

## Production configuration

- Set `NODE_ENV=production`.
- Configure a unique, high-entropy `JWT_SECRET`; startup rejects weak, placeholder, and known demo secrets without logging the configured value.
- Set `CORS_ORIGINS` to the exact HTTPS origins of every frontend that may call this API, separated by commas. Wildcards, paths, and non-HTTPS production origins are rejected.
- Configure `VITE_API_BASE_URL` in the frontend build environment to the deployed HTTPS API URL ending in `/api/v1`.
- Never run the demo seed script against a production database.

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
