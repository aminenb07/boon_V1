# BOON Render Deployment

## Architecture

- Frontend: deploy as a static Vite site on Cloudflare Pages, Vercel, or Render Static Site.
- Backend: deploy `backend/` as a Render Web Service using Docker.
- Database: Render PostgreSQL, wired to Laravel through `DB_URL`.

## Backend Environment Variables

Set these in Render. Never commit real values to GitHub.

```text
APP_KEY=base64:...
APP_URL=https://your-boon-api.onrender.com
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=pgsql
DB_URL=<Render Postgres internal connection string>
```

Generate `APP_KEY` locally from `backend/`:

```bash
php artisan key:generate --show
```

## Frontend Environment Variables

Set this in your frontend host:

```text
VITE_API_BASE_URL=https://your-boon-api.onrender.com/api
```

## Safe Git Push

Check what will be committed:

```bash
git status --short
git diff --stat
```

Never commit:

```text
.env
backend/.env
backend/database/*.sqlite*
backend/dev.db
backend/vendor
node_modules
dist
```

Commit only the deployment/code files you mean to ship:

```bash
git add .gitignore render.yaml DEPLOY_RENDER.md
git add backend/Dockerfile backend/.dockerignore backend/docker/php-production.ini
git add backend/app backend/bootstrap backend/config backend/database backend/public backend/resources backend/routes backend/tests
git add backend/artisan backend/composer.json backend/composer.lock backend/phpunit.xml backend/vite.config.js
git add src package.json pnpm-lock.yaml index.html vite.config.ts postcss.config.mjs public
git commit -m "Prepare Laravel backend for Render deployment"
git push origin main
```

If Git warns that `.env` or a database file is staged, stop and unstage it before pushing.
