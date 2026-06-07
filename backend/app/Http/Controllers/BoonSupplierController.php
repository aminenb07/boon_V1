<?php

namespace App\Http\Controllers;

use App\Support\BoonApiSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BoonSupplierController extends Controller
{
    use BoonApiSupport;

    public function searchSuppliers(Request $request): JsonResponse
    {
        $query = $this->cleanText($request->query('q'));

        $suppliers = DB::table('users')
            ->where('default_role', self::ROLE_SUPPLIER)
            ->when($query, function ($builder) use ($query) {
                $builder->where(function ($nested) use ($query) {
                    $nested->where('full_name', 'like', '%'.$query.'%')
                        ->orWhere('phone', 'like', '%'.$query.'%');
                });
            })
            ->orderByDesc('created_at')
            ->limit(25)
            ->get(['id', 'full_name', 'phone'])
            ->map(fn ($supplier) => [
                'id' => $supplier->id,
                'fullName' => $supplier->full_name,
                'phone' => $supplier->phone,
            ])
            ->values()
            ->all();

        return response()->json($suppliers);
    }

    public function linkSupplier(Request $request, string $roomId, string $workerId): JsonResponse
    {
        $user = $this->authUser($request);
        $supplierId = $this->cleanText($request->input('supplierId'));

        if (! $user) {
            return $this->error('Unauthorized', 401);
        }
        if (! $supplierId) {
            return $this->error('Missing roomId, workerId or supplierId', 400);
        }

        return $this->createSupplierLink($user, $roomId, $workerId, $supplierId);
    }

    public function addSupplierToRoom(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        $supplierId = $this->cleanText($request->input('supplierId'));

        if (! $user) {
            return $this->error('Unauthorized', 401);
        }
        if (! $supplierId) {
            return $this->error('Missing roomId or supplierId', 400);
        }

        return $this->createSupplierLink($user, $roomId, (string) $user->id, $supplierId);
    }

    public function listWorkerSuppliers(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership) {
            return $this->error('Not a member of this room', 403);
        }

        $workerId = $this->cleanText($request->query('workerId'));
        $supplierId = $this->cleanText($request->query('supplierId'));

        $query = DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('status', self::LINK_ACTIVE);

        if ($membership->role === self::ROLE_SUPPLIER) {
            $query->where('supplier_id', $user->id);
        } else {
            if ($workerId) {
                $query->where('worker_id', $workerId);
            }
            if ($supplierId) {
                $query->where('supplier_id', $supplierId);
            }
        }

        return response()->json(
            $this->serializeLinks($query->orderByDesc('created_at')->get())
        );
    }

    public function listMyWorkerSuppliers(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || $membership->role !== self::ROLE_WORKER) {
            return $this->error('Not a WORKER in this room', 403);
        }

        $links = DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('worker_id', $user->id)
            ->where('status', self::LINK_ACTIVE)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($this->serializeLinks($links));
    }

    public function listRoomSuppliers(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || ! in_array($membership->role, [self::ROLE_OWNER, self::ROLE_WORKER], true)) {
            return $this->error('Not allowed for this room', 403);
        }

        $links = DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('status', self::LINK_ACTIVE)
            ->when($membership->role === self::ROLE_WORKER, fn ($query) => $query->where('worker_id', $user->id))
            ->orderByDesc('created_at')
            ->get();

        return response()->json($this->serializeLinks($links));
    }

    public function unlinkRoomSupplier(Request $request, string $roomId, string $supplierId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || ! in_array($membership->role, [self::ROLE_OWNER, self::ROLE_WORKER], true)) {
            return $this->error('Not allowed for this room', 403);
        }

        $query = DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('supplier_id', $supplierId)
            ->where('status', self::LINK_ACTIVE);

        if ($membership->role === self::ROLE_WORKER) {
            $query->where('worker_id', $user->id);
        }

        if (! $query->exists()) {
            return $this->error('Supplier link not found', 404);
        }

        $query->update(['status' => self::LINK_DISABLED]);
        $this->cleanupSupplierMemberships($roomId);

        return response()->json(null, 204);
    }

    public function getProfile(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $profile = DB::table('supplier_store_profiles')
            ->where('supplier_id', $user->id)
            ->first();

        return response()->json($profile ? $this->serializeStoreProfile($profile) : null);
    }

    public function upsertProfile(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $storeName = $this->cleanText($request->input('storeName'));
        $phone = $this->normalizePhone($request->input('phone'));
        $address = $this->cleanText($request->input('address'));

        if (! $storeName || ! $phone || ! $address) {
            return $this->error('Missing required fields', 400);
        }
        if (! $this->isValidPhone($phone)) {
            return $this->error('Invalid phone format', 400);
        }

        $data = [
            'logo_url' => $this->cleanText($request->input('logoUrl')),
            'store_name' => $storeName,
            'phone' => $phone,
            'address' => $address,
            'ice' => $this->cleanText($request->input('ice')),
            'rc' => $this->cleanText($request->input('rc')),
            'footer_note' => $this->cleanText($request->input('footerNote')),
            'updated_at' => now(),
        ];

        $existing = DB::table('supplier_store_profiles')->where('supplier_id', $user->id)->first();
        if ($existing) {
            DB::table('supplier_store_profiles')
                ->where('supplier_id', $user->id)
                ->update($data);
        } else {
            DB::table('supplier_store_profiles')->insert([
                'id' => (string) Str::uuid(),
                'supplier_id' => $user->id,
                ...$data,
                'created_at' => now(),
            ]);
        }

        $profile = DB::table('supplier_store_profiles')
            ->where('supplier_id', $user->id)
            ->first();

        return response()->json($this->serializeStoreProfile($profile));
    }

    private function createSupplierLink(object $user, string $roomId, string $workerId, string $supplierId): JsonResponse
    {
        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || $membership->role !== self::ROLE_WORKER) {
            return $this->error('Only room workers can add suppliers', 403);
        }
        if ($workerId !== $user->id) {
            return $this->error('Worker can only link suppliers to their own scope', 403);
        }

        $room = $this->getRoom($roomId);
        if (! $room) {
            return $this->error('Room not found', 404);
        }
        if ($room->status !== self::STATUS_ACTIVE) {
            return $this->error('Room is closed', 403);
        }

        $workerMembership = $this->getMembership($roomId, $workerId);
        if (! $workerMembership || $workerMembership->role !== self::ROLE_WORKER) {
            return $this->error('workerId must belong to a WORKER in the room', 400);
        }

        $supplier = DB::table('users')->where('id', $supplierId)->first();
        if (! $supplier || $supplier->default_role !== self::ROLE_SUPPLIER) {
            return $this->error('supplierId must be a SUPPLIER user', 400);
        }

        DB::transaction(function () use ($roomId, $supplierId, $workerId): void {
            DB::table('room_members')->updateOrInsert(
                [
                    'room_id' => $roomId,
                    'user_id' => $supplierId,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'role' => self::ROLE_SUPPLIER,
                    'last_seen_at' => now(),
                    'created_at' => now(),
                ]
            );

            DB::table('worker_supplier_links')->updateOrInsert(
                [
                    'room_id' => $roomId,
                    'worker_id' => $workerId,
                    'supplier_id' => $supplierId,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'status' => self::LINK_ACTIVE,
                    'created_at' => now(),
                ]
            );
        });

        $link = DB::table('worker_supplier_links')
            ->where('room_id', $roomId)
            ->where('worker_id', $workerId)
            ->where('supplier_id', $supplierId)
            ->first();

        return response()->json($this->serializeLinks(collect([$link]))[0]);
    }
}
