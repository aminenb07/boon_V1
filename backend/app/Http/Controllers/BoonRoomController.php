<?php

namespace App\Http\Controllers;

use App\Support\BoonApiSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BoonRoomController extends Controller
{
    use BoonApiSupport;

    public function createRoom(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        $name = $this->cleanText($request->input('name'));

        if (! $user) {
            return $this->error('Unauthorized', 401);
        }
        if (! $name) {
            return $this->error('Missing room name', 400);
        }

        $roomId = (string) Str::uuid();
        $roomCode = $this->uniqueRoomCode($name);

        DB::transaction(function () use ($roomCode, $roomId, $name, $user): void {
            DB::table('rooms')->insert([
                'id' => $roomId,
                'name' => $name,
                'room_code' => $roomCode,
                'status' => self::STATUS_ACTIVE,
                'owner_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('room_members')->insert([
                'id' => (string) Str::uuid(),
                'room_id' => $roomId,
                'user_id' => $user->id,
                'role' => self::ROLE_OWNER,
                'last_seen_at' => now(),
                'created_at' => now(),
            ]);
        });

        return response()->json([
            'id' => $roomId,
            'name' => $name,
            'roomCode' => $roomCode,
            'status' => self::STATUS_ACTIVE,
        ]);
    }

    public function listRooms(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $search = $this->cleanText($request->query('search'));
        $filter = strtolower((string) $request->query('filter', 'all'));

        return response()->json($this->buildRoomsList($user, $search, $filter));
    }

    public function roomDetails(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership) {
            return $this->error('Not a member of this room', 403);
        }

        $room = $this->getRoom($roomId);
        if (! $room) {
            return $this->error('Room not found', 404);
        }

        [$ownerTotal] = $this->documentStats($roomId);
        [$workerTotal, $workerDocsCount] = $this->documentStats($roomId, $this->activeSupplierIdsForWorker($roomId, (string) $user->id));
        [$supplierTotal, $supplierDocsCount] = $this->documentStats($roomId, [(string) $user->id]);

        return response()->json([
            'id' => $room->id,
            'name' => $room->name,
            'roomCode' => $room->room_code,
            'status' => $room->status,
            'roleInRoom' => $membership->role,
            'ownerId' => $room->owner_id,
            'lastMessagePreview' => $room->last_activity_preview,
            'lastMessageTime' => $this->toIso($room->last_activity_at),
            'membersCount' => DB::table('room_members')->where('room_id', $roomId)->count(),
            'cachedDocsCount' => DB::table('documents')->where('room_id', $roomId)->where('is_personal', false)->count(),
            'totals' => [
                'owner' => $ownerTotal,
                'workerScope' => $workerTotal,
                'supplierScope' => $supplierTotal,
            ],
            'docsCountByScope' => [
                'workerScope' => $workerDocsCount,
                'supplierScope' => $supplierDocsCount,
            ],
        ]);
    }

    public function roomMembers(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership) {
            return $this->error('Not a member of this room', 403);
        }
        if ($membership->role === self::ROLE_SUPPLIER) {
            return $this->error('Suppliers cannot list all room members in MVP', 403);
        }

        $members = DB::table('room_members')
            ->join('users', 'users.id', '=', 'room_members.user_id')
            ->where('room_members.room_id', $roomId)
            ->orderBy('room_members.created_at')
            ->get([
                'room_members.id',
                'room_members.room_id',
                'room_members.user_id',
                'room_members.role',
                'room_members.last_seen_at',
                'room_members.created_at',
                'users.id as user_model_id',
                'users.full_name',
                'users.phone',
                'users.default_role',
            ])
            ->map(fn ($member) => [
                'id' => $member->id,
                'roomId' => $member->room_id,
                'userId' => $member->user_id,
                'role' => $member->role,
                'lastSeenAt' => $this->toIso($member->last_seen_at),
                'createdAt' => $this->toIso($member->created_at),
                'user' => [
                    'id' => $member->user_model_id,
                    'fullName' => $member->full_name,
                    'phone' => $member->phone,
                    'defaultRole' => $member->default_role,
                ],
            ])
            ->values()
            ->all();

        return response()->json($members);
    }

    public function listJoinRequests(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $requests = DB::table('room_join_requests')
            ->join('rooms', 'rooms.id', '=', 'room_join_requests.room_id')
            ->join('users as workers', 'workers.id', '=', 'room_join_requests.worker_id')
            ->where('room_join_requests.status', self::JOIN_PENDING)
            ->where('rooms.owner_id', $user->id)
            ->orderByDesc('room_join_requests.requested_at')
            ->get([
                'room_join_requests.id',
                'room_join_requests.room_id',
                'room_join_requests.worker_id',
                'room_join_requests.status',
                'room_join_requests.requested_at',
                'room_join_requests.decided_at',
                'room_join_requests.decided_by_id',
                'rooms.id as room_model_id',
                'rooms.name as room_name',
                'rooms.room_code',
                'rooms.status as room_status',
                'workers.id as worker_model_id',
                'workers.full_name as worker_full_name',
                'workers.phone as worker_phone',
            ])
            ->map(fn ($row) => [
                'id' => $row->id,
                'roomId' => $row->room_id,
                'workerId' => $row->worker_id,
                'status' => $row->status,
                'requestedAt' => $this->toIso($row->requested_at),
                'decidedAt' => $this->toIso($row->decided_at),
                'decidedById' => $row->decided_by_id,
                'room' => [
                    'id' => $row->room_model_id,
                    'name' => $row->room_name,
                    'roomCode' => $row->room_code,
                    'status' => $row->room_status,
                ],
                'worker' => [
                    'id' => $row->worker_model_id,
                    'fullName' => $row->worker_full_name,
                    'phone' => $row->worker_phone,
                ],
            ])
            ->values()
            ->all();

        return response()->json($requests);
    }

    public function markRoomRead(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership) {
            return $this->error('Not a member of this room', 403);
        }

        DB::table('room_members')
            ->where('room_id', $roomId)
            ->where('user_id', $user->id)
            ->update(['last_seen_at' => now()]);

        return response()->json(null, 204);
    }

    public function joinRoom(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        $roomCode = strtoupper((string) $this->cleanText($request->input('roomCode')));

        if (! $user) {
            return $this->error('Unauthorized', 401);
        }
        if (! $roomCode) {
            return $this->error('Missing room code', 400);
        }

        $room = DB::table('rooms')->where('room_code', $roomCode)->first();
        if (! $room) {
            return $this->error('Room not found', 404);
        }
        if ($room->status !== self::STATUS_ACTIVE) {
            return $this->error('Room is closed', 403);
        }

        $membership = DB::table('room_members')
            ->where('room_id', $room->id)
            ->where('user_id', $user->id)
            ->first();

        if ($membership) {
            return response()->json([
                'roomId' => $room->id,
                'role' => $membership->role,
                'status' => 'accepted',
            ]);
        }

        $existing = DB::table('room_join_requests')
            ->where('room_id', $room->id)
            ->where('worker_id', $user->id)
            ->first();

        $requestId = $existing?->id ?? (string) Str::uuid();

        DB::table('room_join_requests')->updateOrInsert(
            [
                'room_id' => $room->id,
                'worker_id' => $user->id,
            ],
            [
                'id' => $requestId,
                'status' => self::JOIN_PENDING,
                'requested_at' => now(),
                'decided_at' => null,
                'decided_by_id' => null,
            ]
        );

        return response()->json([
            'roomId' => $room->id,
            'requestId' => $requestId,
            'status' => 'pending',
        ], 202);
    }

    public function decideJoinRequest(Request $request, string $requestId): JsonResponse
    {
        $user = $this->authUser($request);
        $decision = strtolower((string) $this->cleanText($request->input('decision')));

        if (! $user) {
            return $this->error('Unauthorized', 401);
        }
        if (! in_array($decision, ['accept', 'refuse'], true)) {
            return $this->error('Invalid request or decision', 400);
        }

        $joinRequest = DB::table('room_join_requests')
            ->join('rooms', 'rooms.id', '=', 'room_join_requests.room_id')
            ->join('users as workers', 'workers.id', '=', 'room_join_requests.worker_id')
            ->where('room_join_requests.id', $requestId)
            ->first([
                'room_join_requests.id',
                'room_join_requests.room_id',
                'room_join_requests.worker_id',
                'room_join_requests.status',
                'room_join_requests.requested_at',
                'rooms.owner_id',
                'rooms.status as room_status',
                'rooms.name as room_name',
                'rooms.room_code',
                'workers.full_name as worker_full_name',
                'workers.phone as worker_phone',
            ]);

        if (! $joinRequest) {
            return $this->error('Join request not found', 404);
        }
        if ($joinRequest->owner_id !== $user->id) {
            return $this->error('Not allowed for this room', 403);
        }
        if ($joinRequest->status !== self::JOIN_PENDING) {
            return $this->error('Join request already processed', 400);
        }
        if ($decision === 'accept' && $joinRequest->room_status !== self::STATUS_ACTIVE) {
            return $this->error('Room is closed', 403);
        }

        $decidedAt = now();
        DB::transaction(function () use ($decidedAt, $decision, $joinRequest, $user): void {
            if ($decision === 'accept') {
                DB::table('room_members')->updateOrInsert(
                    [
                        'room_id' => $joinRequest->room_id,
                        'user_id' => $joinRequest->worker_id,
                    ],
                    [
                        'id' => (string) Str::uuid(),
                        'role' => self::ROLE_WORKER,
                        'last_seen_at' => $decidedAt,
                        'created_at' => $decidedAt,
                    ]
                );
            }

            DB::table('room_join_requests')
                ->where('id', $joinRequest->id)
                ->update([
                    'status' => $decision === 'accept' ? self::JOIN_ACCEPTED : self::JOIN_REFUSED,
                    'decided_at' => $decidedAt,
                    'decided_by_id' => $user->id,
                ]);
        });

        return response()->json([
            'id' => $joinRequest->id,
            'roomId' => $joinRequest->room_id,
            'workerId' => $joinRequest->worker_id,
            'status' => $decision === 'accept' ? self::JOIN_ACCEPTED : self::JOIN_REFUSED,
            'requestedAt' => $this->toIso($joinRequest->requested_at),
            'decidedAt' => $this->toIso($decidedAt),
            'decidedById' => $user->id,
            'room' => [
                'id' => $joinRequest->room_id,
                'name' => $joinRequest->room_name,
                'roomCode' => $joinRequest->room_code,
                'status' => $joinRequest->room_status,
            ],
            'worker' => [
                'id' => $joinRequest->worker_id,
                'fullName' => $joinRequest->worker_full_name,
                'phone' => $joinRequest->worker_phone,
            ],
        ]);
    }

    public function updateRoomStatus(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        $status = strtoupper((string) $request->input('status'));

        if (! $user) {
            return $this->error('Unauthorized', 401);
        }
        if (! in_array($status, [self::STATUS_ACTIVE, self::STATUS_CLOSED], true)) {
            return $this->error('Invalid room status', 400);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || $membership->role !== self::ROLE_OWNER) {
            return $this->error('Only room owner can update status', 403);
        }

        DB::table('rooms')
            ->where('id', $roomId)
            ->update([
                'status' => $status,
                'updated_at' => now(),
            ]);

        $room = $this->getRoom($roomId);

        return response()->json([
            'id' => $room->id,
            'status' => $room->status,
            'name' => $room->name,
            'roomCode' => $room->room_code,
        ]);
    }

    public function removeRoomMember(Request $request, string $roomId, string $userId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership || $membership->role !== self::ROLE_OWNER) {
            return $this->error('Only room owner can remove members', 403);
        }
        if ($userId === $user->id) {
            return $this->error('Owner cannot remove themselves', 400);
        }

        $target = $this->getMembership($roomId, $userId);
        if (! $target) {
            return $this->error('Member not found', 404);
        }
        if ($target->role === self::ROLE_OWNER) {
            return $this->error('Cannot remove room owner', 400);
        }

        DB::table('room_members')
            ->where('room_id', $roomId)
            ->where('user_id', $userId)
            ->delete();

        if ($target->role === self::ROLE_WORKER) {
            DB::table('worker_supplier_links')
                ->where('room_id', $roomId)
                ->where('worker_id', $userId)
                ->update(['status' => self::LINK_DISABLED]);
        }

        if ($target->role === self::ROLE_SUPPLIER) {
            DB::table('worker_supplier_links')
                ->where('room_id', $roomId)
                ->where('supplier_id', $userId)
                ->update(['status' => self::LINK_DISABLED]);
        }

        $this->cleanupSupplierMemberships($roomId);

        return response()->json(null, 204);
    }

    public function listRoomDocuments(Request $request, string $roomId): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership) {
            return $this->error('Not a member of this room', 403);
        }

        if ($membership->role === self::ROLE_OWNER) {
            $documents = DB::table('documents')
                ->where('room_id', $roomId)
                ->orderBy('created_at')
                ->get();
        } elseif ($membership->role === self::ROLE_WORKER) {
            $supplierIds = $this->activeSupplierIdsForWorker($roomId, (string) $user->id);
            $documents = empty($supplierIds)
                ? collect()
                : DB::table('documents')
                    ->where('room_id', $roomId)
                    ->whereIn('supplier_id', $supplierIds)
                    ->orderBy('created_at')
                    ->get();
        } else {
            $documents = DB::table('documents')
                ->where('room_id', $roomId)
                ->where('supplier_id', $user->id)
                ->orderBy('created_at')
                ->get();
        }

        return response()->json($this->serializeDocuments(collect($documents)));
    }

    public function roomStream(Request $request, string $roomId): JsonResponse|\Symfony\Component\HttpFoundation\Response
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $membership = $this->getMembership($roomId, (string) $user->id);
        if (! $membership) {
            return $this->error('Not a member of this room', 403);
        }

        return response()->stream(function () use ($roomId): void {
            echo "event: ready\n";
            echo 'data: '.json_encode(['roomId' => $roomId, 'ts' => now()->timestamp])."\n\n";
            @ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function buildRoomsList(object $user, ?string $search, string $filter): array
    {
        $memberships = DB::table('room_members')
            ->join('rooms', 'rooms.id', '=', 'room_members.room_id')
            ->where('room_members.user_id', $user->id)
            ->when($search, function ($query) use ($search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('rooms.name', 'like', '%'.$search.'%')
                        ->orWhere('rooms.room_code', 'like', '%'.$search.'%');
                });
            })
            ->when($filter === 'active', fn ($query) => $query->where('rooms.status', self::STATUS_ACTIVE))
            ->when($filter === 'closed', fn ($query) => $query->where('rooms.status', self::STATUS_CLOSED))
            ->orderByDesc('rooms.last_activity_at')
            ->orderByDesc('rooms.created_at')
            ->get([
                'room_members.room_id',
                'room_members.role',
                'room_members.last_seen_at',
                'rooms.id',
                'rooms.name',
                'rooms.room_code',
                'rooms.status',
                'rooms.last_activity_preview',
                'rooms.last_activity_at',
            ]);

        return $memberships->map(function ($membership) use ($user) {
            $role = $membership->role;
            [$ownerTotal] = $this->documentStats($membership->room_id);
            [$workerTotal] = $this->documentStats($membership->room_id, $this->activeSupplierIdsForWorker($membership->room_id, (string) $user->id));
            [$supplierTotal] = $this->documentStats($membership->room_id, [(string) $user->id]);

            return [
                'id' => $membership->id,
                'name' => $membership->name,
                'roomCode' => $membership->room_code,
                'status' => $membership->status,
                'role' => $role,
                'roleInRoom' => $role,
                'lastMessagePreview' => $membership->last_activity_preview,
                'lastMessageTime' => $this->toIso($membership->last_activity_at),
                'totalForOwner' => $role === self::ROLE_OWNER ? $ownerTotal : null,
                'totalForWorkerScope' => $role === self::ROLE_WORKER ? $workerTotal : null,
                'totalForSupplier' => $role === self::ROLE_SUPPLIER ? $supplierTotal : null,
                'unreadCount' => $this->roomUnreadCount($membership->room_id, $role, (string) $user->id, $membership->last_seen_at),
            ];
        })->values()->all();
    }
}
