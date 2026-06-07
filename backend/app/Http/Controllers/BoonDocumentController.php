<?php

namespace App\Http\Controllers;

use App\Support\BoonApiSupport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class BoonDocumentController extends Controller
{
    use BoonApiSupport;

    public function createDocument(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        try {
            return response()->json($this->createDocumentRecord($user, $request->all()));
        } catch (\RuntimeException $exception) {
            return $this->error($exception->getMessage(), (int) $exception->getCode());
        }
    }

    public function listPersonalDocuments(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $documents = DB::table('documents')
            ->where('supplier_id', $user->id)
            ->where('is_personal', true)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($this->serializeDocuments($documents));
    }

    public function createRoomDocument(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || $membership->role !== self::ROLE_SUPPLIER) {
            return $this->error('Supplier is not a member of this room', 403);
        }

        $room = $this->getRoom($roomId);
        if (! $room) {
            return $this->error('Room not found', 404);
        }
        if ($room->status !== self::STATUS_ACTIVE) {
            return $this->error('Room is closed', 403);
        }

        $payload = $request->all();
        $payload['roomId'] = $roomId;
        $payload['isPersonal'] = false;

        if (! $this->cleanText($payload['workerId'] ?? null)) {
            $links = DB::table('worker_supplier_links')
                ->where('room_id', $roomId)
                ->where('supplier_id', $user->id)
                ->where('status', self::LINK_ACTIVE)
                ->pluck('worker_id')
                ->all();

            if (count($links) === 0) {
                return $this->error('Supplier is not linked in this room', 403);
            }
            if (count($links) > 1) {
                return $this->error('Multiple worker scopes found. Please provide workerId.', 400);
            }

            $payload['workerId'] = $links[0];
        }

        try {
            return response()->json($this->createDocumentRecord($user, $payload));
        } catch (\RuntimeException $exception) {
            return $this->error($exception->getMessage(), (int) $exception->getCode());
        }
    }

    public function listMyDocuments(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $scope = strtolower((string) $request->query('scope', 'personal'));
        $query = DB::table('documents')->where('supplier_id', $user->id);

        if ($scope === 'personal') {
            $query->where('is_personal', true);
        } elseif ($scope === 'room') {
            $query->where('is_personal', false);
        }

        return response()->json(
            $this->serializeDocuments($query->orderByDesc('created_at')->get())
        );
    }

    public function createMyDocument(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $payload = $request->all();
        $payload['isPersonal'] = true;

        try {
            return response()->json($this->createDocumentRecord($user, $payload));
        } catch (\RuntimeException $exception) {
            return $this->error($exception->getMessage(), (int) $exception->getCode());
        }
    }

    public function getDocument(Request $request, string $id): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }
        if (! $this->canAccessDocument($user, $document)) {
            return $this->error('Forbidden', 403);
        }

        return response()->json($this->serializeDocument($document));
    }

    public function deleteDocument(Request $request, string $id): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }
        if ($document->supplier_id !== $user->id || ! $document->is_personal) {
            return $this->error('Only your personal documents can be deleted', 403);
        }

        DB::table('documents')->where('id', $id)->delete();
        if ($document->room_id) {
            $this->refreshRoomActivity((string) $document->room_id);
        }

        return response()->json(null, 204);
    }

    public function documentShare(Request $request, string $id): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }
        if (! $this->canAccessDocument($user, $document)) {
            return $this->error('Forbidden', 403);
        }

        $payload = $this->serializeDocument($document);
        $pdfUrl = URL::temporarySignedRoute(
            'api.public.documents.pdf',
            now()->addDays(7),
            ['id' => $id]
        );
        $message = rawurlencode($this->buildShareText($payload)."\n".$pdfUrl);

        return response()->json([
            'pdfUrl' => $pdfUrl,
            'whatsappUrl' => "https://wa.me/?text={$message}",
        ]);
    }

    public function exportDocumentPdf(Request $request, string $id): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }
        if (! $this->canAccessDocument($user, $document)) {
            return $this->error('Forbidden', 403);
        }

        return response()->json([
            'documentId' => $id,
            'pdfUrl' => $this->authenticatedPdfUrl($request, $id, $this->authToken($request)),
        ]);
    }

    public function exportMyDocumentPdf(Request $request, string $id): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }
        if ($document->supplier_id !== $user->id || ! $document->is_personal) {
            return $this->error('Only your personal documents can be exported here', 403);
        }

        return response()->json([
            'documentId' => $id,
            'pdfUrl' => $this->authenticatedPdfUrl($request, $id, $this->authToken($request)),
        ]);
    }

    public function documentPdf(Request $request, string $id)
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }
        if (! $this->canAccessDocument($user, $document)) {
            return $this->error('Forbidden', 403);
        }

        return $this->pdfResponse($this->serializeDocument($document));
    }

    public function publicDocumentPdf(string $id)
    {
        $document = DB::table('documents')->where('id', $id)->first();
        if (! $document) {
            return $this->error('Not found', 404);
        }

        return $this->pdfResponse($this->serializeDocument($document));
    }

    private function createDocumentRecord(object $user, array $payload): array
    {
        $type = strtoupper((string) ($payload['type'] ?? ''));
        $roomId = $this->cleanText($payload['roomId'] ?? null);
        $workerId = $this->cleanText($payload['workerId'] ?? null);
        $isPersonal = (bool) ($payload['isPersonal'] ?? false);
        $quickAmount = isset($payload['quickAmount']) && $payload['quickAmount'] !== '' ? (float) $payload['quickAmount'] : null;
        $category = $this->cleanText($payload['category'] ?? null);
        $note = $this->cleanText($payload['note'] ?? null);
        $currency = strtoupper((string) ($payload['currency'] ?? 'MAD'));
        $photoUrl = $this->cleanText($payload['photoUrl'] ?? null);
        $attachments = is_array($payload['attachments'] ?? null) ? $payload['attachments'] : [];
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];

        if (! $this->isDocumentType($type)) {
            throw new \RuntimeException('Invalid document type', 400);
        }

        $storeProfile = DB::table('supplier_store_profiles')->where('supplier_id', $user->id)->first();
        if (! $storeProfile) {
            throw new \RuntimeException('Supplier profile is required before creating documents', 400);
        }

        if ($roomId) {
            $room = $this->getRoom($roomId);
            if (! $room) {
                throw new \RuntimeException('Room not found', 404);
            }
            if ($room->status !== self::STATUS_ACTIVE) {
                throw new \RuntimeException('Room is closed', 403);
            }

            $membership = $this->getMembership($roomId, (string) $user->id);
            if (! $membership || $membership->role !== self::ROLE_SUPPLIER) {
                throw new \RuntimeException('Supplier is not a member of this room', 403);
            }
            if (! $workerId) {
                throw new \RuntimeException('workerId is required for room document', 400);
            }

            $linkExists = DB::table('worker_supplier_links')
                ->where('room_id', $roomId)
                ->where('worker_id', $workerId)
                ->where('supplier_id', $user->id)
                ->where('status', self::LINK_ACTIVE)
                ->exists();

            if (! $linkExists) {
                throw new \RuntimeException('No active worker link in this room', 403);
            }

            $isPersonal = false;
        } else {
            $roomId = null;
            $workerId = null;
            $isPersonal = true;
        }

        if ($photoUrl && empty($attachments)) {
            $attachments[] = [
                'fileUrl' => $photoUrl,
                'mimeType' => 'image/jpeg',
            ];
        }

        $normalizedItems = collect($items)
            ->map(function ($item, int $index) {
                $name = $this->cleanText($item['productName'] ?? null);
                $qty = isset($item['qty']) ? (float) $item['qty'] : 0;
                $unitPrice = isset($item['unitPrice']) ? (float) $item['unitPrice'] : 0;
                if (! $name || $qty <= 0 || $unitPrice < 0) {
                    return null;
                }

                return [
                    'id' => (string) Str::uuid(),
                    'product_name' => $name,
                    'qty' => round($qty, 2),
                    'unit' => $this->cleanText($item['unit'] ?? null),
                    'unit_price' => round($unitPrice, 2),
                    'line_total' => round($qty * $unitPrice, 2),
                    'position' => $index,
                ];
            })
            ->filter()
            ->values();

        $grandTotal = $normalizedItems->sum('line_total');
        if ($grandTotal <= 0 && $quickAmount !== null) {
            $grandTotal = round($quickAmount, 2);
        }
        if ($grandTotal <= 0) {
            throw new \RuntimeException('Amount must be greater than 0', 400);
        }

        $attachmentRows = collect($attachments)
            ->map(function ($attachment) {
                $fileUrl = $this->cleanText($attachment['fileUrl'] ?? null);
                if (! $fileUrl) {
                    return null;
                }

                return [
                    'id' => (string) Str::uuid(),
                    'file_url' => $fileUrl,
                    'mime_type' => $this->cleanText($attachment['mimeType'] ?? null) ?: 'application/octet-stream',
                ];
            })
            ->filter()
            ->values();

        $documentId = (string) Str::uuid();
        DB::transaction(function () use ($attachmentRows, $category, $currency, $documentId, $grandTotal, $isPersonal, $normalizedItems, $note, $quickAmount, $roomId, $storeProfile, $type, $user, $workerId): void {
            DB::table('documents')->insert([
                'id' => $documentId,
                'type' => $type,
                'room_id' => $roomId,
                'worker_id' => $workerId,
                'supplier_id' => $user->id,
                'created_by_supplier_id' => $user->id,
                'store_profile_id' => $storeProfile->id,
                'quick_amount' => $quickAmount ? round($quickAmount, 2) : null,
                'category' => $category,
                'note' => $note,
                'currency' => $currency ?: 'MAD',
                'grand_total' => round($grandTotal, 2),
                'is_personal' => $isPersonal,
                'immutable' => true,
                'created_at' => now(),
            ]);

            foreach ($normalizedItems as $item) {
                DB::table('document_items')->insert([
                    ...$item,
                    'document_id' => $documentId,
                ]);
            }

            foreach ($attachmentRows as $attachment) {
                DB::table('attachments')->insert([
                    ...$attachment,
                    'document_id' => $documentId,
                    'created_at' => now(),
                ]);
            }
        });

        if ($roomId) {
            $this->refreshRoomActivity($roomId);
            DB::table('worker_supplier_links')
                ->where('room_id', $roomId)
                ->where('supplier_id', $user->id)
                ->update(['last_activity_at' => now()]);
        }

        return $this->serializeDocument(DB::table('documents')->where('id', $documentId)->first());
    }

    private function pdfResponse(array $document)
    {
        $pdf = Pdf::loadView('pdf.document', [
            'document' => $document,
        ])->setPaper('a4');

        return $pdf->stream('boon-'.$document['id'].'.pdf');
    }
}
