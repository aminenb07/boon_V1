<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * BoonApiSupport - A shared trait that contains ALL core business logic and utility functions
 *
 * This trait is used across all controllers to ensure consistency and avoid code duplication
 */
trait BoonApiSupport
{
    // User Roles
    private const ROLE_OWNER = 'OWNER';
    private const ROLE_WORKER = 'WORKER';
    private const ROLE_SUPPLIER = 'SUPPLIER';

    // General Statuses
    private const STATUS_ACTIVE = 'ACTIVE';
    private const STATUS_CLOSED = 'CLOSED';
    private const STATUS_DISABLED = 'DISABLED';

    // Worker-Supplier Link Statuses
    private const LINK_ACTIVE = 'ACTIVE';
    private const LINK_DISABLED = 'DISABLED';

    // Join Request Statuses
    private const JOIN_PENDING = 'PENDING';
    private const JOIN_ACCEPTED = 'ACCEPTED';
    private const JOIN_REFUSED = 'REFUSED';

    // Time-to-Live (TTL) Constants
    private const VERIFICATION_TTL_MINUTES = 10;
    private const MAX_VERIFICATION_ATTEMPTS = 5;
    private const ACCESS_TOKEN_TTL_MINUTES = 15;
    private const REFRESH_TOKEN_TTL_DAYS = 30;

    // ==========================================
    // REQUEST & AUTH HELPERS
    // ==========================================

    /**
     * Get the authenticated user from request attributes (set by BoonAuthenticate middleware)
     */
    private function authUser(Request $request): ?object
    {
        return $request->attributes->get('boon.user');
    }

    /**
     * Get the raw auth token from request attributes
     */
    private function authToken(Request $request): ?string
    {
        return $request->attributes->get('boon.token');
    }

    /**
     * Generate a standardized JSON error response
     */
    private function error(string $message, int $status): JsonResponse
    {
        return response()->json(['error' => $message], $status);
    }

    // ==========================================
    // INPUT NORMALIZATION & VALIDATION
    // ==========================================

    /**
     * Normalize a phone number by removing formatting characters and standardizing prefix
     */
    private function normalizePhone(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = preg_replace('/[\s\-\(\)]+/', '', trim($value));
        if (! $trimmed) {
            return null;
        }
        if (str_starts_with($trimmed, '00')) {
            $trimmed = '+'.substr($trimmed, 2);
        }

        return $trimmed;
    }

    /**
     * Normalize email by lowercasing and trimming
     */
    private function normalizeEmail(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = strtolower(trim($value));

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * Clean and trim text input, returns null if empty
     */
    private function cleanText(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * Check if the given role is a valid user role
     */
    private function isRole(string $role): bool
    {
        return in_array($role, [self::ROLE_OWNER, self::ROLE_WORKER, self::ROLE_SUPPLIER], true);
    }

    /**
     * Check if the given document type is valid
     */
    private function isDocumentType(string $type): bool
    {
        return in_array($type, ['RECEIPT', 'INVOICE', 'QUOTE'], true);
    }

    /**
     * Validate that a phone number is in a valid format
     */
    private function isValidPhone(string $phone): bool
    {
        return (bool) preg_match('/^\+?\d{8,15}$/', $phone);
    }

    /**
     * Validate password strength, returns error message if invalid
     */
    private function passwordPolicyError(string $password): ?string
    {
        if (mb_strlen($password) < 10) {
            return 'Password must be at least 10 characters long';
        }
        if (! preg_match('/[A-Z]/', $password)) {
            return 'Password must include an uppercase letter';
        }
        if (! preg_match('/[a-z]/', $password)) {
            return 'Password must include a lowercase letter';
        }
        if (! preg_match('/\d/', $password)) {
            return 'Password must include a number';
        }

        return null;
    }

    // ==========================================
    // FORMAT HELPERS
    // ==========================================

    /**
     * Mask a phone number for display (shows first 4 and last 3 digits)
     */
    private function maskPhone(string $phone): string
    {
        if (mb_strlen($phone) <= 4) {
            return $phone;
        }

        return mb_substr($phone, 0, 4).str_repeat('*', max(mb_strlen($phone) - 7, 3)).mb_substr($phone, -3);
    }

    /**
     * Convert a datetime value to ISO 8601 string
     */
    private function toIso(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->toIso8601String();
    }

    // ==========================================
    // SERIALIZERS (Convert DB records to API responses)
    // ==========================================

    /**
     * Serialize a user record for API responses
     */
    private function serializeUser(object $user): array
    {
        return [
            'id' => $user->id,
            'phone' => $user->phone,
            'email' => $user->email,
            'fullName' => $user->full_name,
            'role' => $user->default_role,
            'phoneVerifiedAt' => $this->toIso($user->phone_verified_at),
            'status' => $user->status,
        ];
    }

    /**
     * Serialize a supplier store profile for API responses
     */
    private function serializeStoreProfile(?object $profile): ?array
    {
        if (! $profile) {
            return null;
        }

        return [
            'id' => $profile->id,
            'supplierId' => $profile->supplier_id,
            'logoUrl' => $profile->logo_url,
            'storeName' => $profile->store_name,
            'phone' => $profile->phone,
            'address' => $profile->address,
            'ice' => $profile->ice,
            'rc' => $profile->rc,
            'footerNote' => $profile->footer_note,
            'createdAt' => $this->toIso($profile->created_at),
            'updatedAt' => $this->toIso($profile->updated_at),
        ];
    }

    // ==========================================
    // AUTH & VERIFICATION
    // ==========================================

    /**
     * Create a new access and refresh token pair for a user
     */
    private function createApiToken(string $userId): array
    {
        $token = Str::random(80);
        $refreshToken = Str::random(100);

        DB::table('api_tokens')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addMinutes(self::ACCESS_TOKEN_TTL_MINUTES),
            'refresh_token_hash' => hash('sha256', $refreshToken),
            'refresh_expires_at' => now()->addDays(self::REFRESH_TOKEN_TTL_DAYS),
            'created_at' => now(),
        ]);

        return [
            'token' => $token,
            'refreshToken' => $refreshToken,
            'expiresInSeconds' => self::ACCESS_TOKEN_TTL_MINUTES * 60,
        ];
    }

    /**
     * Issue and store a new phone verification code
     */
    private function issuePhoneVerificationCode(object $user): array
    {
        $code = config('app.env') === 'production'
            ? (string) random_int(100000, 999999)
            : '123456';

        DB::table('phone_verification_codes')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'phone' => $user->phone,
            'code_hash' => hash('sha256', $code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::VERIFICATION_TTL_MINUTES),
            'created_at' => now(),
        ]);

        return [
            'verificationRequired' => true,
            'phone' => $user->phone,
            'maskedPhone' => $this->maskPhone($user->phone),
            'expiresInSeconds' => self::VERIFICATION_TTL_MINUTES * 60,
            'devCode' => config('app.env') === 'production' ? null : $code,
        ];
    }

    /**
     * Find a user by either phone or email
     */
    private function findUserByIdentifier(string $identifier): ?object
    {
        $phone = $this->normalizePhone($identifier);
        $email = $this->normalizeEmail($identifier);

        return DB::table('users')
            ->when($phone || $email, function ($query) use ($phone, $email) {
                $query->where(function ($nested) use ($phone, $email) {
                    if ($phone) {
                        $nested->orWhere('phone', $phone);
                    }
                    if ($email) {
                        $nested->orWhere('email', $email);
                    }
                });
            })
            ->first();
    }

    // ==========================================
    // ROOM & MEMBERSHIP HELPERS
    // ==========================================

    /**
     * Get a user's membership record for a specific room
     */
    private function getMembership(string $roomId, string $userId): ?object
    {
        return DB::table('room_members')
            ->where('room_id', $roomId)
            ->where('user_id', $userId)
            ->first();
    }

    /**
     * Get a room record by ID
     */
    private function getRoom(string $roomId): ?object
    {
        return DB::table('rooms')->where('id', $roomId)->first();
    }

    /**
     * Generate a unique, human-readable room code from the room name
     */
    private function uniqueRoomCode(string $name): string
    {
        do {
            $prefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 3));
            $prefix = str_pad($prefix ?: 'BOO', 3, 'X');
            $candidate = $prefix.'-'.strtoupper(Str::random(3));
        } while (DB::table('rooms')->where('room_code', $candidate)->exists());

        return $candidate;
    }

    /**
     * Get all active supplier IDs linked to a specific worker in a room
     */
    private function activeSupplierIdsForWorker(string $roomId, string $workerId): array
    {
        return DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('worker_id', $workerId)
            ->where('status', self::LINK_ACTIVE)
            ->pluck('supplier_id')
            ->all();
    }

    /**
     * Get document stats (total amount + count) for a room (optionally filtered by supplier IDs)
     * Returns [total_amount, document_count]
     */
    private function documentStats(string $roomId, ?array $supplierIds = null): array
    {
        $query = DB::table('documents')
            ->where('room_id', $roomId)
            ->where('is_personal', false);

        if ($supplierIds !== null) {
            if (empty($supplierIds)) {
                return [0.0, 0];
            }
            $query->whereIn('supplier_id', $supplierIds);
        }

        $total = (float) ($query->sum('grand_total') ?: 0);
        $count = (int) $query->count();

        return [round($total, 2), $count];
    }

    /**
     * Calculate unread document count for a user in a room based on last seen time
     */
    private function roomUnreadCount(string $roomId, string $role, string $userId, mixed $lastSeenAt): int
    {
        $query = DB::table('documents')
            ->where('room_id', $roomId)
            ->where('is_personal', false);

        if ($lastSeenAt) {
            $query->where('created_at', '>', $lastSeenAt);
        }

        if ($role === self::ROLE_WORKER) {
            $supplierIds = $this->activeSupplierIdsForWorker($roomId, $userId);
            if (empty($supplierIds)) {
                return 0;
            }
            $query->whereIn('supplier_id', $supplierIds);
        }

        if ($role === self::ROLE_SUPPLIER) {
            $query->where('supplier_id', $userId);
        }

        return $query->count();
    }

    /**
     * Update a room's last activity timestamp and preview text based on the latest document
     */
    private function refreshRoomActivity(string $roomId): void
    {
        $latest = DB::table('documents')
            ->join('users', 'users.id', '=', 'documents.supplier_id')
            ->where('documents.room_id', $roomId)
            ->where('documents.is_personal', false)
            ->orderByDesc('documents.created_at')
            ->first([
                'documents.category',
                'documents.type',
                'documents.grand_total',
                'documents.currency',
                'documents.created_at',
                'users.full_name',
            ]);

        DB::table('rooms')
            ->where('id', $roomId)
            ->update([
                'last_activity_at' => $latest?->created_at,
                'last_activity_preview' => $latest
                    ? "{$latest->full_name} - ".($latest->category ?: $latest->type)." - ".number_format((float) $latest->grand_total, 2, '.', '')." {$latest->currency}"
                    : null,
                'updated_at' => now(),
            ]);
    }

    /**
     * Remove supplier room members that no longer have any active worker links
     */
    private function cleanupSupplierMemberships(string $roomId): void
    {
        $activeSupplierIds = DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('status', self::LINK_ACTIVE)
            ->pluck('supplier_id')
            ->unique()
            ->all();

        $query = DB::table('room_members')
            ->where('room_id', $roomId)
            ->where('role', self::ROLE_SUPPLIER);

        if (! empty($activeSupplierIds)) {
            $query->whereNotIn('user_id', $activeSupplierIds);
        }

        $query->delete();
    }

    // ==========================================
    // DOCUMENT & PERMISSION HELPERS
    // ==========================================

    /**
     * Check if a user has permission to access a specific document
     */
    private function canAccessDocument(object $user, object $document): bool
    {
        if ((bool) $document->is_personal) {
            return $document->supplier_id === $user->id;
        }

        if ($user->default_role === self::ROLE_OWNER) {
            return DB::table('room_members')
                ->where('room_id', $document->room_id)
                ->where('user_id', $user->id)
                ->where('role', self::ROLE_OWNER)
                ->exists();
        }

        if ($user->default_role === self::ROLE_WORKER) {
            return DB::table('worker_supplier_links')
                ->where('room_id', $document->room_id)
                ->where('worker_id', $user->id)
                ->where('supplier_id', $document->supplier_id)
                ->where('status', self::LINK_ACTIVE)
                ->exists();
        }

        return $document->supplier_id === $user->id;
    }

    /**
     * Build a shareable text snippet for WhatsApp
     */
    private function buildShareText(array $document): string
    {
        $title = $document['category'] ?: $document['type'];

        return implode("\n", [
            $document['storeProfile']['storeName'] ?? 'BOON',
            'BOON '.$title,
            'Total: '.number_format((float) $document['grandTotal'], 2, '.', '').' '.$document['currency'],
            'Date: '.str_replace('T', ' ', substr((string) $document['createdAt'], 0, 16)),
            'Phone: '.($document['storeProfile']['phone'] ?? '-'),
        ]);
    }

    /**
     * Generate a URL for accessing a PDF with authentication token
     */
    private function authenticatedPdfUrl(Request $request, string $documentId, ?string $token): string
    {
        $base = rtrim($request->getSchemeAndHttpHost(), '/')."/api/documents/{$documentId}/pdf";

        return $token
            ? $base.'?token='.urlencode($token)
            : $base;
    }

    // ==========================================
    // COLLECTION SERIALIZERS (Bulk operations)
    // ==========================================

    /**
     * Serialize a collection of worker-supplier links
     */
    private function serializeLinks(Collection $links): array
    {
        if ($links->isEmpty()) {
            return [];
        }

        $workerIds = $links->pluck('worker_id')->unique()->values()->all();
        $supplierIds = $links->pluck('supplier_id')->unique()->values()->all();
        $roomIds = $links->pluck('room_id')->unique()->values()->all();

        $workers = DB::table('users')->whereIn('id', $workerIds)->get()->keyBy('id');
        $suppliers = DB::table('users')->whereIn('id', $supplierIds)->get()->keyBy('id');
        $stats = DB::table('documents')
            ->selectRaw('room_id, supplier_id, SUM(grand_total) as total, COUNT(*) as docs_count, MAX(created_at) as last_activity_at')
            ->whereIn('room_id', $roomIds)
            ->where('is_personal', false)
            ->groupBy('room_id', 'supplier_id')
            ->get()
            ->keyBy(fn ($row) => $row->room_id.'|'.$row->supplier_id);

        return $links->map(function ($link) use ($stats, $suppliers, $workers) {
            $stat = $stats->get($link->room_id.'|'.$link->supplier_id);
            $worker = $workers->get($link->worker_id);
            $supplier = $suppliers->get($link->supplier_id);

            return [
                'id' => $link->id,
                'roomId' => $link->room_id,
                'workerId' => $link->worker_id,
                'supplierId' => $link->supplier_id,
                'status' => $link->status,
                'cachedTotal' => round((float) ($stat->total ?? 0), 2),
                'cachedDocsCount' => (int) ($stat->docs_count ?? 0),
                'lastActivityAt' => $this->toIso($stat->last_activity_at ?? null),
                'createdAt' => $this->toIso($link->created_at),
                'worker' => $worker ? [
                    'id' => $worker->id,
                    'fullName' => $worker->full_name,
                    'phone' => $worker->phone,
                ] : null,
                'supplier' => $supplier ? [
                    'id' => $supplier->id,
                    'fullName' => $supplier->full_name,
                    'phone' => $supplier->phone,
                ] : null,
            ];
        })->values()->all();
    }

    /**
     * Serialize a collection of documents with all related data (suppliers, items, attachments, profiles)
     */
    private function serializeDocuments(Collection $documents): array
    {
        if ($documents->isEmpty()) {
            return [];
        }

        $documentIds = $documents->pluck('id')->all();
        $supplierIds = $documents->pluck('supplier_id')->unique()->all();
        $storeProfileIds = $documents->pluck('store_profile_id')->unique()->all();

        $suppliers = DB::table('users')->whereIn('id', $supplierIds)->get()->keyBy('id');
        $profiles = DB::table('supplier_store_profiles')->whereIn('id', $storeProfileIds)->get()->keyBy('id');
        $items = DB::table('document_items')
            ->whereIn('document_id', $documentIds)
            ->orderBy('position')
            ->get()
            ->groupBy('document_id');
        $attachments = DB::table('attachments')
            ->whereIn('document_id', $documentIds)
            ->orderBy('created_at')
            ->get()
            ->groupBy('document_id');

        return $documents->map(function ($document) use ($attachments, $items, $profiles, $suppliers) {
            $supplier = $suppliers->get($document->supplier_id);
            $profile = $profiles->get($document->store_profile_id);

            return [
                'id' => $document->id,
                'type' => $document->type,
                'roomId' => $document->room_id,
                'workerId' => $document->worker_id,
                'supplierId' => $document->supplier_id,
                'quickAmount' => $document->quick_amount !== null ? round((float) $document->quick_amount, 2) : null,
                'category' => $document->category,
                'note' => $document->note,
                'currency' => $document->currency,
                'grandTotal' => round((float) $document->grand_total, 2),
                'isPersonal' => (bool) $document->is_personal,
                'immutable' => (bool) $document->immutable,
                'createdAt' => $this->toIso($document->created_at),
                'supplier' => [
                    'id' => $supplier?->id,
                    'fullName' => $supplier?->full_name,
                    'phone' => $supplier?->phone,
                ],
                'storeProfile' => $this->serializeStoreProfile($profile),
                'items' => collect($items->get($document->id, []))->map(fn ($item) => [
                    'id' => $item->id,
                    'productName' => $item->product_name,
                    'qty' => (float) $item->qty,
                    'unit' => $item->unit,
                    'unitPrice' => round((float) $item->unit_price, 2),
                    'lineTotal' => round((float) $item->line_total, 2),
                    'position' => (int) $item->position,
                ])->values()->all(),
                'attachments' => collect($attachments->get($document->id, []))->map(fn ($attachment) => [
                    'id' => $attachment->id,
                    'fileUrl' => $attachment->file_url,
                    'mimeType' => $attachment->mime_type,
                    'createdAt' => $this->toIso($attachment->created_at),
                ])->values()->all(),
            ];
        })->values()->all();
    }

    /**
     * Serialize a single document (wrapper around serializeDocuments)
     */
    private function serializeDocument(object $document): array
    {
        return $this->serializeDocuments(collect([$document]))[0];
    }
}
