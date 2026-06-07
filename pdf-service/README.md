# PDF Service

This folder is reserved for the dedicated Cloud Run Puppeteer renderer in the target production stack.

Responsibilities:

- Accept document rendering requests from the main API
- Render BOON printable documents with Puppeteer
- Return a PDF stream or generated file URL
- Stay isolated from the main API request path

Recommended next files:

- Dockerfile
- package.json
- src/server.ts
- src/render-document.ts
- .dockerignore
