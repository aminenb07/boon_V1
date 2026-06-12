# BOON

BOON now runs on a React 19 frontend and a Laravel 12 API.

## Stack

- Frontend: Vite + React 19
- Backend: Laravel 12
- Database: SQLite for local development
- PDF export: `barryvdh/laravel-dompdf`

The old Node/Prisma backend was kept in `backend-node-legacy/` as a safety backup.

## Project layout

- `src/`: React application
- `backend/`: Laravel API
- `.env`: frontend API configuration
- `backend/.env`: backend configuration

## Local run

### Frontend

```powershell
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

### Backend

If `php` is already installed on your machine:

```powershell
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

If `php` is not installed globally, this repo also works with the local portable PHP copied into `.tools/php`:

```powershell
cd backend
..\.tools\php\php.exe ..\.tools\composer.phar install
..\.tools\php\php.exe artisan key:generate
..\.tools\php\php.exe artisan migrate
..\.tools\php\php.exe artisan serve --host=127.0.0.1 --port=8000
```

Backend runs at `http://127.0.0.1:8000`.

## Environment

Frontend `.env`:

```bash
VITE_APP_RUNTIME=rest
VITE_API_BASE_URL=http://localhost:8000/api
```

For a dev tunnel setup where the frontend runs on `https://grbhbht0-5173.uks1.devtunnels.ms` and the backend runs on `https://grbhbht0-8000.uks1.devtunnels.ms`, set:

```bash
VITE_API_BASE_URL=https://grbhbht0-8000.uks1.devtunnels.ms/api
```

Backend `.env` uses SQLite by default:

```bash
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
APP_URL=http://127.0.0.1:8000
```

## Quick checks

- Frontend build: `npm run build`
- Backend tests: `cd backend && php artisan test`
- Backend health: `http://127.0.0.1:8000/api/health`

Expected health response:

```json
{ "status": "ok", "app": "BOON API" }
```
