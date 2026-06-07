<?php

namespace App\Http\Controllers;

use App\Support\BoonApiSupport;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BoonAuthController extends Controller
{
    use BoonApiSupport;

    public function register(Request $request): JsonResponse
    {
        $phone = $this->normalizePhone($request->input('phone'));
        $email = $this->normalizeEmail($request->input('email'));
        $password = $this->cleanText($request->input('password'));
        $fullName = $this->cleanText($request->input('fullName'));
        $role = strtoupper((string) $request->input('role'));

        if (! $phone || ! $password || ! $fullName || ! $this->isRole($role)) {
            return $this->error('Missing or invalid fields', 400);
        }
        if (! $this->isValidPhone($phone)) {
            return $this->error('Invalid phone format', 400);
        }
        if ($email && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error('Invalid email format', 400);
        }
        if ($passwordError = $this->passwordPolicyError($password)) {
            return $this->error($passwordError, 400);
        }

        $exists = DB::table('users')
            ->where('phone', $phone)
            ->when($email, fn ($query) => $query->orWhere('email', $email))
            ->exists();

        if ($exists) {
            return $this->error('Phone or email already in use', 409);
        }

        $userId = (string) Str::uuid();
        DB::table('users')->insert([
            'id' => $userId,
            'phone' => $phone,
            'email' => $email,
            'password_hash' => Hash::make($password),
            'full_name' => $fullName,
            'default_role' => $role,
            'status' => self::STATUS_ACTIVE,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = DB::table('users')->where('id', $userId)->first();
        $verification = $this->issuePhoneVerificationCode($user);

        return response()->json([
            'user' => $this->serializeUser($user),
            ...$verification,
        ], 202);
    }

    public function login(Request $request): JsonResponse
    {
        $identifier = $this->cleanText($request->input('identifier'));
        $password = $this->cleanText($request->input('password'));

        if (! $identifier || ! $password) {
            return $this->error('Missing identifier or password', 400);
        }

        $user = $this->findUserByIdentifier($identifier);
        if (! $user || ! Hash::check($password, (string) $user->password_hash)) {
            return $this->error('Invalid credentials', 401);
        }
        if ($user->status !== self::STATUS_ACTIVE) {
            return $this->error('Account is disabled', 403);
        }

        if (! $user->phone_verified_at) {
            $verification = $this->issuePhoneVerificationCode($user);

            return response()->json([
                'error' => 'Phone verification required',
                'user' => $this->serializeUser($user),
                ...$verification,
            ], 403);
        }

        return response()->json([
            ...$this->createApiToken((string) $user->id),
            'user' => $this->serializeUser($user),
        ]);
    }

    public function verifyPhone(Request $request): JsonResponse
    {
        $phone = $this->normalizePhone($request->input('phone'));
        $code = $this->cleanText($request->input('code'));

        if (! $phone || ! $code) {
            return $this->error('phone and code are required', 400);
        }

        $user = DB::table('users')->where('phone', $phone)->first();
        if (! $user) {
            return $this->error('Account not found', 404);
        }
        if ($user->status !== self::STATUS_ACTIVE) {
            return $this->error('Account is disabled', 403);
        }

        $record = DB::table('phone_verification_codes')
            ->where('user_id', $user->id)
            ->where('phone', $phone)
            ->whereNull('consumed_at')
            ->orderByDesc('created_at')
            ->first();

        if (! $record) {
            return $this->error('Verification code not found', 400);
        }
        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::table('phone_verification_codes')
                ->where('id', $record->id)
                ->update(['consumed_at' => now()]);

            return $this->error('Verification code expired', 400);
        }
        if ((int) $record->attempts >= self::MAX_VERIFICATION_ATTEMPTS) {
            return $this->error('Too many verification attempts', 429);
        }
        if (hash('sha256', $code) !== $record->code_hash) {
            DB::table('phone_verification_codes')
                ->where('id', $record->id)
                ->update(['attempts' => (int) $record->attempts + 1]);

            return $this->error('Invalid verification code', 400);
        }

        DB::table('phone_verification_codes')
            ->where('id', $record->id)
            ->update(['consumed_at' => now()]);

        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'phone_verified_at' => now(),
                'updated_at' => now(),
            ]);

        $updatedUser = DB::table('users')->where('id', $user->id)->first();

        return response()->json([
            ...$this->createApiToken((string) $updatedUser->id),
            'user' => $this->serializeUser($updatedUser),
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $refreshToken = $this->cleanText($request->input('refreshToken'));
        if (! $refreshToken) {
            return $this->error('refreshToken is required', 400);
        }

        $now = now();
        $record = DB::table('api_tokens')
            ->join('users', 'users.id', '=', 'api_tokens.user_id')
            ->where('refresh_token_hash', hash('sha256', $refreshToken))
            ->where('refresh_expires_at', '>', $now)
            ->whereNull('revoked_at')
            ->where('users.status', self::STATUS_ACTIVE)
            ->first([
                'api_tokens.id as token_id',
                'users.id',
                'users.phone',
                'users.email',
                'users.full_name',
                'users.default_role',
                'users.phone_verified_at',
                'users.status',
            ]);

        if (! $record) {
            return $this->error('Unauthorized', 401);
        }

        $token = Str::random(80);
        $nextRefreshToken = Str::random(100);

        DB::table('api_tokens')
            ->where('id', $record->token_id)
            ->update([
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addMinutes(self::ACCESS_TOKEN_TTL_MINUTES),
                'refresh_token_hash' => hash('sha256', $nextRefreshToken),
                'refresh_expires_at' => now()->addDays(self::REFRESH_TOKEN_TTL_DAYS),
                'last_used_at' => $now,
            ]);

        $user = (object) [
            'id' => $record->id,
            'phone' => $record->phone,
            'email' => $record->email,
            'full_name' => $record->full_name,
            'default_role' => $record->default_role,
            'phone_verified_at' => $record->phone_verified_at,
            'status' => $record->status,
        ];

        return response()->json([
            'token' => $token,
            'refreshToken' => $nextRefreshToken,
            'expiresInSeconds' => self::ACCESS_TOKEN_TTL_MINUTES * 60,
            'user' => $this->serializeUser($user),
        ]);
    }

    public function resendCode(Request $request): JsonResponse
    {
        $phone = $this->normalizePhone($request->input('phone'));
        if (! $phone) {
            return $this->error('phone is required', 400);
        }

        $user = DB::table('users')->where('phone', $phone)->first();
        if (! $user) {
            return $this->error('Account not found', 404);
        }
        if ($user->status !== self::STATUS_ACTIVE) {
            return $this->error('Account is disabled', 403);
        }

        return response()->json($this->issuePhoneVerificationCode($user));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('User not found', 404);
        }

        return response()->json($this->serializeUser($user));
    }

    public function updateMe(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('User not found', 404);
        }

        $fullName = $this->cleanText($request->input('fullName'));
        $email = $this->normalizeEmail($request->input('email'));

        if (! $fullName) {
            return $this->error('fullName is required', 400);
        }
        if ($email && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error('Invalid email format', 400);
        }

        $emailExists = $email
            ? DB::table('users')
                ->where('email', $email)
                ->where('id', '!=', $user->id)
                ->exists()
            : false;

        if ($emailExists) {
            return $this->error('Email already in use', 409);
        }

        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'full_name' => $fullName,
                'email' => $email,
                'updated_at' => now(),
            ]);

        return response()->json(
            $this->serializeUser(DB::table('users')->where('id', $user->id)->first())
        );
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
        if (! $user) {
            return $this->error('User not found', 404);
        }

        $currentPassword = $this->cleanText($request->input('currentPassword'));
        $newPassword = $this->cleanText($request->input('newPassword'));

        if (! $currentPassword || ! $newPassword) {
            return $this->error('currentPassword and newPassword are required', 400);
        }
        if (! Hash::check($currentPassword, (string) $user->password_hash)) {
            return $this->error('Current password is incorrect', 401);
        }
        if ($passwordError = $this->passwordPolicyError($newPassword)) {
            return $this->error($passwordError, 400);
        }

        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'password_hash' => Hash::make($newPassword),
                'updated_at' => now(),
            ]);

        return response()->json(null, 204);
    }
}
