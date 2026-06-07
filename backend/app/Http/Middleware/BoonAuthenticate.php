<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BoonAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);
        if (! $token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $now = now();
        $record = DB::table('api_tokens')
            ->join('users', 'users.id', '=', 'api_tokens.user_id')
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', $now)
            ->whereNull('revoked_at')
            ->where('users.status', 'ACTIVE')
            ->first([
                'api_tokens.id as token_id',
                'api_tokens.last_used_at',
                'users.id',
                'users.phone',
                'users.email',
                'users.full_name',
                'users.default_role',
                'users.phone_verified_at',
                'users.status',
            ]);

        if (! $record) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        DB::table('api_tokens')
            ->where('id', $record->token_id)
            ->where(function ($query) use ($now) {
                $query->whereNull('last_used_at')
                    ->orWhere('last_used_at', '<', $now->copy()->subMinute());
            })
            ->update(['last_used_at' => $now]);

        $user = (object) [
            'id' => $record->id,
            'phone' => $record->phone,
            'email' => $record->email,
            'full_name' => $record->full_name,
            'default_role' => $record->default_role,
            'phone_verified_at' => $record->phone_verified_at,
            'status' => $record->status,
        ];

        $request->attributes->set('boon.user', $user);
        $request->attributes->set('boon.token', $token);

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        $bearer = $request->bearerToken();
        if (is_string($bearer) && $bearer !== '') {
            return $bearer;
        }

        $queryToken = $request->query('token');

        return is_string($queryToken) && $queryToken !== ''
            ? $queryToken
            : null;
    }
}
