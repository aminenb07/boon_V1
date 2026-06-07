# BOON Production Stack

## Target architecture

| Layer | Target host |
| --- | --- |
| Frontend | Cloudflare Pages or Vercel |
| Backend API | Cloudflare Workers with Fastify |
| Database | Turso with edge replicas |
| Storage | Cloudflare R2 |
| PDF rendering | Cloud Run with Puppeteer |

## Free-first recommendation

Use Cloudflare Pages plus Cloudflare Workers as the default public path when minimizing cost.
Use Vercel only as an optional frontend host.
Keep Cloud Run only for PDF rendering, not for the main API.

## Current repo status

- The existing API code in this repository is still Express-based in backend/src/server.ts.
- The target production stack above is the new deployment direction.
- Frontend should remain in REST mode during migration.
- Firebase remains optional and incomplete.

Frontend runtime values:

~~~bash
VITE_APP_RUNTIME=rest
VITE_API_BASE_URL=https://boon-api.your-subdomain.workers.dev/api
~~~

## Workers responsibilities

- Auth endpoints and JWT validation
- Room CRUD and join flow
- Membership and supplier-link rules
- Document creation and reads
- Analytics overview
- R2 object orchestration
- Calls to the dedicated PDF service

## Required Workers settings

- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN as a secret
- JWT_SECRET as a secret
- PUBLIC_API_BASE_URL
- CORS_ORIGIN
- PDF_SERVICE_BASE_URL
- PDF_SERVICE_TOKEN as a secret
- SMS_WEBHOOK_URL
- SMS_WEBHOOK_TOKEN as a secret if needed
- ALLOW_DEV_VERIFICATION_CODE=false
- R2 bucket binding named BOON_UPLOADS

## Migration phases

1. Keep the frontend on REST mode.
2. Extract shared business logic from the Express backend.
3. Stand up the Cloudflare Workers API with the same contract.
4. Move file attachments and uploads to R2.
5. Split PDF generation into the dedicated Cloud Run Puppeteer service.
6. Point production frontend traffic to the Workers hostname.
7. Retire Render and the monolithic Cloud Run backend path.

## Legacy files

These files now describe the old deployment path and should be treated as migration references only:

- render.yaml
- cloudbuild.yaml
- backend/.env.example
- README sections about Render, Railway, and monolithic Cloud Run
