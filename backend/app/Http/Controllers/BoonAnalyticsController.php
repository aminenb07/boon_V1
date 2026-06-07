<?php

namespace App\Http\Controllers;

use App\Support\BoonApiSupport;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoonAnalyticsController extends Controller
{
    use BoonApiSupport;

    public function overview(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('Unauthorized', 401);
        }

        $documents = $this->accessibleAnalyticsDocuments($user);
        $now = now();
        $last7 = collect(range(0, 6))->map(function (int $index) use ($now) {
            $date = $now->copy()->subDays(6 - $index);

            return [
                'date' => $date->format('Y-m-d'),
                'label' => $date->translatedFormat('D'),
                'amount' => 0.0,
                'count' => 0,
            ];
        })->keyBy('date');

        $totals = [
            'today' => 0.0,
            'week' => 0.0,
            'month' => 0.0,
            'all' => 0.0,
            'personal' => 0.0,
            'room' => 0.0,
        ];
        $byType = [];
        $byCategory = [];
        $bySupplier = [];
        $roomIds = [];

        foreach ($documents as $document) {
            $amount = (float) $document->grand_total;
            $createdAt = Carbon::parse($document->created_at);
            $dateKey = $createdAt->format('Y-m-d');

            $totals['all'] += $amount;
            if ($document->is_personal) {
                $totals['personal'] += $amount;
            } else {
                $totals['room'] += $amount;
            }
            if ($createdAt->greaterThanOrEqualTo($now->copy()->startOfDay())) {
                $totals['today'] += $amount;
            }
            if ($createdAt->greaterThanOrEqualTo($now->copy()->startOfWeek())) {
                $totals['week'] += $amount;
            }
            if ($createdAt->greaterThanOrEqualTo($now->copy()->startOfMonth())) {
                $totals['month'] += $amount;
            }

            $byType[$document->type] ??= ['type' => $document->type, 'count' => 0, 'amount' => 0.0];
            $byType[$document->type]['count']++;
            $byType[$document->type]['amount'] += $amount;

            $category = $document->category ?: 'Uncategorized';
            $byCategory[$category] ??= ['category' => $category, 'count' => 0, 'amount' => 0.0];
            $byCategory[$category]['count']++;
            $byCategory[$category]['amount'] += $amount;

            $bySupplier[$document->supplier_id] ??= [
                'supplierId' => $document->supplier_id,
                'supplierName' => $document->supplier_name,
                'count' => 0,
                'amount' => 0.0,
            ];
            $bySupplier[$document->supplier_id]['count']++;
            $bySupplier[$document->supplier_id]['amount'] += $amount;

            if ($document->room_id) {
                $roomIds[$document->room_id] = true;
            }

            if ($last7->has($dateKey)) {
                $entry = $last7->get($dateKey);
                $entry['count']++;
                $entry['amount'] += $amount;
                $last7->put($dateKey, $entry);
            }
        }

        return response()->json([
            'totals' => array_map(fn ($value) => round($value, 2), $totals),
            'documentsCount' => count($documents),
            'roomsCount' => count($roomIds),
            'byType' => collect($byType)->sortByDesc('amount')->values()->all(),
            'byCategory' => collect($byCategory)->sortByDesc('amount')->take(8)->values()->all(),
            'topSuppliers' => collect($bySupplier)->sortByDesc('amount')->take(6)->values()->all(),
            'last7Days' => $last7->values()->map(function (array $entry) {
                $entry['amount'] = round($entry['amount'], 2);

                return $entry;
            })->all(),
        ]);
    }

    private function accessibleAnalyticsDocuments(object $user): array
    {
        if ($user->default_role === self::ROLE_OWNER) {
            return DB::table('documents')
                ->join('rooms', 'rooms.id', '=', 'documents.room_id')
                ->join('users as suppliers', 'suppliers.id', '=', 'documents.supplier_id')
                ->where('rooms.owner_id', $user->id)
                ->get([
                    'documents.*',
                    'suppliers.full_name as supplier_name',
                ])
                ->all();
        }

        if ($user->default_role === self::ROLE_WORKER) {
            return DB::table('documents')
                ->join('worker_supplier_links', function ($join) use ($user) {
                    $join->on('worker_supplier_links.room_id', '=', 'documents.room_id')
                        ->on('worker_supplier_links.supplier_id', '=', 'documents.supplier_id')
                        ->where('worker_supplier_links.worker_id', '=', $user->id)
                        ->where('worker_supplier_links.status', '=', self::LINK_ACTIVE);
                })
                ->join('users as suppliers', 'suppliers.id', '=', 'documents.supplier_id')
                ->distinct()
                ->get([
                    'documents.*',
                    'suppliers.full_name as supplier_name',
                ])
                ->all();
        }

        return DB::table('documents')
            ->join('users as suppliers', 'suppliers.id', '=', 'documents.supplier_id')
            ->where('documents.supplier_id', $user->id)
            ->get([
                'documents.*',
                'suppliers.full_name as supplier_name',
            ])
            ->all();
    }
}


