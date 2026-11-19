# OpsDesk AI frontend

React and Vite frontend for the OpsDesk AI API.

## Requirements

- Node.js 20+
- OpsDesk backend reachable at `http://localhost:5000`

## Setup and start

From the repository root, run:

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open the Vite URL shown in the terminal (by default `http://localhost:5173`).
Set `VITE_API_BASE_URL` in `.env.local` when the backend API is hosted elsewhere.
The base URL includes the API prefix, for example
`VITE_API_BASE_URL=https://api.example.com/api/v1`.

## Build

Production builds require `VITE_API_BASE_URL` to point to the deployed HTTPS API,
including the `/api/v1` prefix. For example, configure
`VITE_API_BASE_URL=https://api.example.com/api/v1` in the build environment.
The build fails with a configuration error if this value is missing or invalid.
Only Vite development mode falls back to `http://localhost:5000/api/v1`.

```powershell
npm.cmd run build
npm.cmd run preview
```

## Authentication and access

Sign in with an account managed by the backend. Public sign-up is not available:
an authenticated `ADMIN` can register team members from **Team members**. The
backend remains authoritative for organization isolation and role permissions.
