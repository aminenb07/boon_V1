# BOON

BOON is a mobile-first construction invoicing app with role-based rooms for `OWNER`, `WORKER`, and `SUPPLIER`.

## Current structure

- `src/`
  - Vite + React frontend
  - API client in `src/app/api.ts`
- `backend/`
  - Express API in `backend/src/server.ts`
  - Prisma schema in `backend/prisma/schema.prisma`
  - Local dev database in `backend/dev.db`

## Deployment-ready backend plan

The backend is already closer to production than the older JSON server:

- Auth, login, register, phone verification, JWT
- Role-based access control
- Prisma data access
- PDF export and WhatsApp sharing
- Room streams and scoped visibility

The only unsafe part for public deployment was the local file database:

- `backend/dev.db` is good for local development
- it is not good for Render or Railway production instances

## Recommended public setup

Cheapest path first:

1. Frontend: keep on Vercel
2. Backend API: deploy `backend/` on Render
3. Database: use Turso free libSQL database

This is the lowest-friction option because the backend already uses Prisma's libSQL adapter.

## Environment variables

### Frontend (`Vercel`)

Use:

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com/api
```

Example file:

- `.env.example`

### Backend (`Render` or `Railway`)

Use:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=libsql://your-database-name-your-org.turso.io
DATABASE_AUTH_TOKEN=your_turso_auth_token
JWT_SECRET=replace_with_a_long_random_secret
PUBLIC_API_BASE_URL=https://your-backend-service.onrender.com
CORS_ORIGIN=https://your-frontend-project.vercel.app
SMS_WEBHOOK_URL=
SMS_WEBHOOK_TOKEN=
ALLOW_DEV_VERIFICATION_CODE=false
```

Example file:

- `backend/.env.example`

## Code changes already applied

- Frontend API now supports `VITE_API_BASE_URL` in `src/app/api.ts`
- Frontend local dev now proxies `/api` to `http://localhost:4000` in `vite.config.ts`
- Backend now supports remote libSQL auth tokens via `DATABASE_AUTH_TOKEN` in:
  - `backend/src/server.ts`
  - `backend/prisma/seed.js`
- Backend trusts reverse proxies so generated public URLs are correct on Render/Railway:
  - `backend/src/server.ts`
- Added Prisma deploy scripts in `backend/package.json`
- Added `backend/scripts/check-env.cjs` so Render/Railway fail fast when production env vars are missing
- Added `render.yaml` for Render deployment

## Local development

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run env:check
npm run prisma:generate
npm run dev
```

If you want a fresh local database:

```bash
cd backend
npm run seed
```

## Step-by-step: cheapest/free option first

### Option 1: Render + Turso

#### A. Create the database

1. Create a free Turso database.
2. Copy the database URL.
3. Generate a database auth token.

You will use:

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`

#### B. Prepare a clean deploy database locally

From `backend/`:

```bash
npm install
npm run prisma:generate
npm run seed
```

That keeps the schema and removes demo/runtime data from `backend/dev.db`.

If you changed the schema locally and need to rebuild the local SQLite file first:

```bash
npx prisma migrate reset --force
```

#### C. Create the Turso database from the local SQLite file

Install the Turso CLI, then:

```bash
turso db create boon-production --from-file ./backend/dev.db
turso db show boon-production --url
turso db tokens create boon-production
```

After that, copy:

- the `libsql://...` database URL
- the database auth token

#### D. Deploy backend to Render

1. Push the repository to GitHub.
2. In Render, create a new Web Service from the repo.
3. Set `Root Directory` to `backend`.
4. Use:

```bash
Build Command:
npm ci && npm run env:check && npm run prisma:generate && npm run build

Start Command:
npm start
```

5. Add these environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL`
   - `DATABASE_AUTH_TOKEN`
   - `JWT_SECRET`
   - `PUBLIC_API_BASE_URL`
   - `CORS_ORIGIN`
   - `SMS_WEBHOOK_URL` if you have SMS delivery
   - `SMS_WEBHOOK_TOKEN` if your SMS gateway needs it
   - `ALLOW_DEV_VERIFICATION_CODE=false`

6. Deploy.
7. Open:

```bash
https://your-backend-service.onrender.com/api/health
```

It should return:

```json
{ "status": "ok", "app": "BOON API" }
```

#### E. Connect Vercel frontend

In your Vercel project settings, add:

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com/api
```

Then redeploy the frontend.

#### F. Phone verification

For public registration to work with real users, `SMS_WEBHOOK_URL` must point to a real SMS provider webhook or adapter.

Without it:

- `login` works for already verified users
- `register` creates accounts
- phone verification codes cannot be delivered publicly

## Option 2: Railway + Turso

This is similar, but Railway billing is usually not as friendly for fully free long-term hosting as Render + Turso.

Use the same backend environment variables.

In Railway:

1. Create a new service from GitHub.
2. Set the service root directory to `backend`.
3. Use:

```bash
Build Command:
npm ci && npm run env:check && npm run prisma:generate && npm run build

Start Command:
npm start
```

4. Add the same env vars.
5. Deploy.
6. Update Vercel:

```bash
VITE_API_BASE_URL=https://your-railway-domain.up.railway.app/api
```

## Option 3: Cloud Run + Turso

This keeps the current backend stack unchanged:

- Cloud Run for the Node/Express API
- Turso for the libSQL database
- Vercel for the frontend

Files prepared for this flow:

- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/public/boon.png`
- `backend/cloudrun.env.example.yaml`

Deploy steps:

1. Install and authenticate the Google Cloud CLI.

2. Set your project:

```bash
gcloud config set project YOUR_GCP_PROJECT_ID
```

3. Enable the required APIs:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

4. Copy the env template and fill in your real values:

```bash
cp backend/cloudrun.env.example.yaml backend/cloudrun.env.yaml
```

5. Deploy from the `backend/` source directory:

```bash
gcloud run deploy boon-api \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file backend/cloudrun.env.yaml
```

Cloud Run will build the container from `backend/Dockerfile`.

6. After deployment, Cloud Run returns a service URL like:

```bash
https://boon-api-xxxxx-uc.a.run.app
```

Set that URL in `backend/cloudrun.env.yaml` as:

```bash
PUBLIC_API_BASE_URL: "https://boon-api-xxxxx-uc.a.run.app"
```

Then redeploy once:

```bash
gcloud run deploy boon-api \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file backend/cloudrun.env.yaml
```

7. Test the health endpoint:

```bash
https://boon-api-xxxxx-uc.a.run.app/api/health
```

8. In Vercel, set:

```bash
VITE_API_BASE_URL=https://boon-api-xxxxx-uc.a.run.app/api
```

## Why Turso instead of replacing everything with Postgres right now

Because your current backend already uses:

- `@prisma/adapter-libsql`
- Prisma schema/migrations built around SQLite/libSQL

So Turso gives you a real public database with the smallest code change.

Moving to Postgres is possible later, but it is a bigger migration:

- schema provider changes
- adapter changes
- migration reset/retest
- deployment retest

## Public auth checklist

To make auth work publicly:

1. Backend must be reachable from the public internet
2. `CORS_ORIGIN` must include your Vercel frontend URL
3. Vercel must have `VITE_API_BASE_URL`
4. `JWT_SECRET` must be set
5. Phone verification needs a real `SMS_WEBHOOK_URL`

## Important production notes

- Do not use `backend/dev.db` in public hosting
- Do not leave `ALLOW_DEV_VERIFICATION_CODE=true`
- Do not leave `CORS_ORIGIN` empty in production
- Do not rely on ephemeral local storage for uploaded files later

## Useful commands

### Generate Prisma client

```bash
cd backend
npm run env:check
npm run prisma:generate
```

### Validate production env

```bash
cd backend
npm run env:check
```

### Push schema directly

```bash
cd backend
npm run prisma:push
```

### Build frontend

```bash
npm run build
```

### Build backend

```bash
cd backend
npm run build
```
