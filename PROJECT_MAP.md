# BOON Project Architecture

This document explains the complete architecture of the BOON construction document workflow system.

## Table of Contents

- [High Level Overview](#high-level-overview)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Main Workflows](#main-workflows)

---

## High Level Overview

```
┌───────────────────┐
│  React Frontend   │
│   (src/)         │
└────────┬──────────┘
         │ HTTP/REST
         │
┌────────▼──────────┐
│  Laravel Backend  │
│  (backend/)       │
└────────┬──────────┘
         │
┌────────▼──────────┐
│  SQLite Database  │
└───────────────────┘
```

BOON is a monorepo containing both frontend and backend code.

---

## Frontend Architecture

### Directory Structure

```
src/
├── app/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Button, Card, Input, etc.)
│   │   ├── App.tsx          # Main app entry
│   │   ├── AuthGate.tsx     # Authentication wrapper
│   │   ├── BoonCenter.tsx   # Document management
│   │   ├── BottomNav.tsx    # Bottom navigation
│   │   ├── Dashboard.tsx    # Home dashboard
│   │   ├── Profile.tsx      # User profile/settings
│   │   ├── Reports.tsx      # Analytics reports
│   │   └── RoomLive.tsx     # Room chat with documents
│   ├── api.ts               # API types & functions
│   └── api-rest.ts          # REST API implementations
├── assets/                  # Static assets
├── styles/                  # Global styles
└── main.tsx                 # React entry point
```

### Main Components

- **AuthGate**: Handles login/register/phone verification
- **Dashboard**: User's home page based on their role
- **RoomLive**: Collab room for sharing documents
- **BoonCenter**: Personal document management
- **Reports**: Analytics and visualizations
- **Profile**: Manage account, language, theme, and supplier profile

---

## Backend Architecture

### Directory Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/      # Request handlers
│   │   └── Middleware/       # Auth & role checks
│   ├── Models/               # Eloquent models
│   ├── Providers/            # Service providers
│   └── Support/              # Reusable traits
├── database/
│   ├── migrations/           # Database migrations
│   ├── factories/            # Test factories
│   └── seeders/              # Database seeders
├── routes/
│   ├── api.php               # API routes
│   └── web.php               # Web routes
└── resources/
    └── views/
        └── pdf/              # PDF templates
```

### Controllers

1. **BoonAuthController**: User authentication (register/login/verify/refresh)
2. **BoonRoomController**: Room management (create/list/join/manage members)
3. **BoonDocumentController**: Document CRUD & PDF generation
4. **BoonSupplierController**: Supplier profiles & worker/supplier linking
5. **BoonAnalyticsController**: Analytics and reporting

### Key Traits

- **BoonApiSupport**: Contains ALL business logic, helpers, serializers, and constants used across controllers

---

## Database Schema

### Core Tables

| Table                      | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `users`                    | User accounts (owner/worker/supplier)    |
| `api_tokens`               | Authentication tokens (access + refresh) |
| `phone_verification_codes` | Phone number verification                |
| `supplier_store_profiles`  | Supplier business info                   |
| `rooms`                    | Collaboration rooms                      |
| `room_members`             | Room members with roles                  |
| `room_join_requests`       | Pending join requests                    |
| `worker_supplier_links`    | Links workers to suppliers in a room     |
| `documents`                | Main document records                    |
| `document_items`           | Line items for documents                 |
| `attachments`              | File attachments for documents           |

### User Roles

- `OWNER`: Creates rooms and sees all documents
- `WORKER`: Joins rooms, links suppliers
- `SUPPLIER`: Creates and shares documents

### Document Types

- `RECEIPT`
- `INVOICE`
- `QUOTE`

---

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `GET /api/public/documents/{id}/pdf` - Public PDF (signed URL)

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-phone` - Verify phone
- `POST /api/auth/resend-code` - Resend verification code
- `POST /api/auth/refresh` - Refresh access token

### Protected Endpoints (Require Auth)

#### Users & Profile

- `GET /api/me` - Get current user
- `PUT /api/me/profile` - Update profile
- `PUT /api/me/password` - Change password

#### Rooms

- `POST /api/rooms` - Create room (owner only)
- `GET /api/rooms` - List user's rooms
- `POST /api/rooms/join` - Join room (worker only)
- `GET /api/rooms/{roomId}` - Get room details
- `GET /api/rooms/{roomId}/members` - List room members
- `POST /api/rooms/{roomId}/read` - Mark room as read
- `PUT /api/rooms/{roomId}/status` - Update room status (owner only)
- `DELETE /api/rooms/{roomId}/members/{userId}` - Remove member (owner only)
- `GET /api/rooms/{roomId}/documents` - List room documents
- `POST /api/rooms/{roomId}/documents` - Create room document (supplier only)
- `GET /api/rooms/{roomId}/stream` - SSE stream (placeholder)

#### Join Requests

- `GET /api/join-requests` - List pending requests (owner only)
- `POST /api/join-requests/{requestId}/decision` - Accept/Refuse request (owner only)

#### Suppliers

- `GET /api/users/suppliers` - Search suppliers (owner/worker only)
- `GET /api/supplier/profile` - Get supplier profile (supplier only)
- `PUT /api/supplier/profile` - Update supplier profile (supplier only)
- `POST /api/rooms/{roomId}/workers/{workerId}/link-supplier` - Link supplier (worker only)
- `POST /api/rooms/{roomId}/suppliers` - Add supplier to room (worker only)
- `GET /api/rooms/{roomId}/worker-suppliers` - List worker-supplier links
- `GET /api/rooms/{roomId}/worker-suppliers/me` - My worker-supplier links (worker only)
- `GET /api/rooms/{roomId}/suppliers` - List room suppliers (owner/worker only)
- `DELETE /api/rooms/{roomId}/suppliers/{supplierId}` - Remove supplier (owner/worker only)

#### Documents

- `GET /api/documents/personal` - List personal docs (supplier only)
- `POST /api/documents` - Create document (supplier only)
- `GET /api/documents/{id}` - Get document
- `DELETE /api/documents/{id}` - Delete document (supplier only, personal only)
- `GET /api/documents/{id}/share` - Get share link & WhatsApp message
- `POST /api/documents/{id}/export-pdf` - Get PDF URL
- `GET /api/documents/{id}/pdf` - Stream PDF

#### My Documents (Supplier)

- `GET /api/me/documents` - List my documents
- `POST /api/me/documents` - Create personal document
- `POST /api/me/documents/{id}/export-pdf` - Export personal document PDF

#### Analytics

- `GET /api/analytics/overview` - Get analytics overview

---

## Main Workflows

### 1. Authentication Flow

```
User Register → Issue Verification Code → Verify Phone → Get Tokens
              OR
User Login → (if not verified: Issue Code) → Get Tokens
```

### 2. Room Workflow (Owner)

```
Create Room → Share Room Code → Worker Joins → Owner Approves → Manage Members → Close Room
```

### 3. Room Workflow (Worker)

```
Join Room → Link Suppliers → See Documents from Linked Suppliers
```

### 4. Document Workflow (Supplier)

```
Create Supplier Profile → Create Personal Documents → Join Room → Link to Worker → Share Room Documents
```

### 5. Document Sharing

```
Create Document → Generate Share Link (signed URL) → Share via WhatsApp or Direct Link
```
