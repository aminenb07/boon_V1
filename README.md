
# BOON App

Mobile-first BOON client + API (Owner / Worker / Supplier).

## Run frontend

1. `npm i`
2. `npm run dev`

## Run backend

1. `cd backend`
2. `npm i`
3. `npm run dev`

## New working features

- Language switch: `en`, `fr`, `ar` (with RTL for Arabic)
- Theme mode: `light`, `dark`, `system (device)`
- Profile settings:
  - Update full name + phone
  - Change password
- Supplier store profile settings (template for boons/PDF)
- Real-time room stream (SSE): room documents appear live like chat
- Room operations:
  - Owner creates room
  - Worker joins by room code
  - Worker links suppliers in room (supplier cannot join by code in MVP)
  - Supplier sends room boons
  - Owner can close/reopen room (`ACTIVE` / `CLOSED`)
- Boon center:
  - Personal boons (supplier)
  - Room boons (all roles by access)
  - Share WhatsApp
  - Open PDF
- Role-based bottom navigation and action visibility
- WhatsApp-style rooms UX:
  - Rooms list cards with search/filter (`all`, `active`, `closed`)
  - Role badge + last activity preview + scoped totals + unread counter
  - In-room role tabs (feed/summary/members/export/settings per role)
  - Closed room is read-only (no new boons, no supplier linking)
- Backend room caching:
  - Cached room total + last activity (`Room`)
  - Cached worker scope totals (`RoomWorkerScopeCache`)
  - Cached supplier totals (`RoomSupplierScopeCache`)
- API additions:
  - `GET /api/rooms?search=&filter=`
  - `GET /api/rooms/:roomId`
  - `POST /api/rooms/:roomId/read`
  - `PUT /api/rooms/:roomId/status`
  - `POST /api/rooms/:roomId/suppliers`
  - `GET /api/rooms/:roomId/suppliers`
  - `POST /api/rooms/:roomId/documents`
  - `GET /api/me/documents`
  - `POST /api/me/documents`
  - `POST /api/documents/:id/export-pdf`
  - `POST /api/me/documents/:id/export-pdf`
- Security hardening:
  - Strong password policy
  - Auth rate limiting
  - Security headers
  - Query-token allowed only for PDF route
  
