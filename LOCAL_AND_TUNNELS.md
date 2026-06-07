# BOON Local + Port Forward Guide

This guide is for running BOON on your machine and opening it through forwarded links like:

- Frontend: `https://grbhbht0-5173.uks1.devtunnels.ms/`
- Backend: `https://grbhbht0-8000.uks1.devtunnels.ms/`

The app has two parts:

- React frontend on port `5173`
- Laravel backend API on port `8000`

## 1. Start The Backend

Open a PowerShell terminal:

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

Check the backend locally:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

Expected response:

```json
{"status":"ok","app":"BOON API"}
```

## 2. Start The Frontend

Open a second PowerShell terminal from the repo root:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

Local frontend:

```text
http://127.0.0.1:5173/
```

Local frontend API proxy:

```text
http://127.0.0.1:5173/api/health
```

If this returns the backend health JSON, the frontend can talk to the backend.

## 3. Frontend `.env`

For local work, use:

```env
VITE_APP_RUNTIME=rest
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

For your devtunnel setup, use:

```env
VITE_APP_RUNTIME=rest
VITE_API_BASE_URL=https://grbhbht0-8000.uks1.devtunnels.ms/api
```

Important: when the frontend is opened from a `*.devtunnels.ms` URL, the app uses `/api` through the Vite proxy. That means the frontend tunnel can call:

```text
https://grbhbht0-5173.uks1.devtunnels.ms/api/health
```

and Vite forwards it to:

```text
http://127.0.0.1:8000/api/health
```

## 4. Backend `.env`

In `backend/.env`, set the backend URL and CORS origin:

```env
APP_URL=https://grbhbht0-8000.uks1.devtunnels.ms
CORS_ALLOWED_ORIGINS=https://grbhbht0-5173.uks1.devtunnels.ms,http://localhost:5173,http://127.0.0.1:5173
```

After changing backend `.env`, clear Laravel config:

```powershell
cd backend
php artisan config:clear
```

Then restart the backend server.

## 5. Port Forward / Devtunnel Pattern

Forward these local ports:

```text
5173 -> frontend
8000 -> backend
```

Your public links should look like:

```text
https://grbhbht0-5173.uks1.devtunnels.ms/
https://grbhbht0-8000.uks1.devtunnels.ms/
```

The most important public test is:

```text
https://grbhbht0-5173.uks1.devtunnels.ms/api/health
```

If that works, the frontend tunnel is correctly reaching the backend through the local proxy.

## 6. If The Devtunnel Links Do Not Work

If these links do not open:

```text
https://grbhbht0-5173.uks1.devtunnels.ms/
https://grbhbht0-8000.uks1.devtunnels.ms/
```

first check that the app works locally. Run these two commands:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/api/health
```

If both return this:

```json
{"status":"ok","app":"BOON API"}
```

then BOON is working locally. The problem is not the frontend/backend code. The problem is the public port-forward/devtunnel session.

Use this normal startup order:

1. Start backend on port `8000`.

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

2. Start frontend on port `5173`.

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

3. Start or refresh the port forward for both ports:

```text
5173 -> public frontend URL
8000 -> public backend URL
```

4. Test the frontend tunnel API path:

```text
https://grbhbht0-5173.uks1.devtunnels.ms/api/health
```

If this does not return the health JSON, recreate or restart the devtunnel/port-forward for port `5173`.

5. Test the backend tunnel directly:

```text
https://grbhbht0-8000.uks1.devtunnels.ms/api/health
```

If this does not return the health JSON, recreate or restart the devtunnel/port-forward for port `8000`.

Important notes:

- Devtunnel links are not permanent unless your tunnel tool keeps the same URL reserved.
- If you stop the tunnel process, the public links stop working.
- If the tunnel tool creates a new URL, update `.env` and `backend/.env` with the new URLs.
- Always restart Vite after changing frontend `.env`.
- Always run `php artisan config:clear` and restart Laravel after changing `backend/.env`.

## 7. Quick Troubleshooting

If the frontend opens but API calls fail:

1. Check backend local health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

2. Check frontend proxy health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/api/health
```

3. Restart Vite after changing `.env` or `vite.config.ts`.

4. Restart Laravel after changing `backend/.env`.

5. If PowerShell blocks `npm`, use `npm.cmd`:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

## 8. Build And Test

Frontend build:

```powershell
npm.cmd run build
```

Backend tests:

```powershell
cd backend
php artisan test
```
