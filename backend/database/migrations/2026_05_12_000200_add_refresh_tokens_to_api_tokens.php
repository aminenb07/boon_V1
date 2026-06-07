<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_tokens', function (Blueprint $table) {
            $table->string('refresh_token_hash')->nullable()->unique()->after('expires_at');
            $table->timestamp('refresh_expires_at')->nullable()->after('refresh_token_hash');
            $table->timestamp('revoked_at')->nullable()->after('refresh_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('api_tokens', function (Blueprint $table) {
            $table->dropColumn(['refresh_token_hash', 'refresh_expires_at', 'revoked_at']);
        });
    }
};
