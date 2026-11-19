# OpsDesk AI

OpsDesk AI is a travel-support operations workspace for managing tickets,
team conversations, supplier communication drafts, and SLA visibility.

## Project structure

- `backend/` — Express API with MongoDB
- `frontend/` — React and Vite application

## Local development

Requirements: Node.js 20+ and a local MongoDB instance.

### Backend

In PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Set `MONGODB_URI` to your local development database and replace the example
`JWT_SECRET` before starting the API:

```powershell
npm install
npm run dev
```

The API listens on port `5000` by default. See [backend/README.md](backend/README.md)
for configuration details. Only run the seed script against a disposable local
development database, never a production or remote database.

### Frontend

In another PowerShell terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Vite serves the frontend at `http://localhost:5173` by default. Development mode
uses the local API unless `VITE_API_BASE_URL` is set. Production builds require
`VITE_API_BASE_URL` to be an HTTPS API URL ending in `/api/v1`; see
[frontend/README.md](frontend/README.md).

## Tests

```powershell
cd backend
npm test
```

Do not commit local `.env` files or credentials. Environment example files
contain placeholders only.
