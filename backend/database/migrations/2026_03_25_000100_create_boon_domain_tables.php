<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('token_hash')->unique();
            $table->timestamp('expires_at');
            $table->string('refresh_token_hash')->unique();
            $table->timestamp('refresh_expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('supplier_store_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('supplier_id')->unique();
            $table->string('logo_url')->nullable();
            $table->string('store_name');
            $table->string('phone');
            $table->string('address');
            $table->string('ice')->nullable();
            $table->string('rc')->nullable();
            $table->text('footer_note')->nullable();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('room_code')->unique();
            $table->string('status')->default('ACTIVE');
            $table->uuid('owner_id');
            $table->text('last_activity_preview')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->foreign('owner_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('room_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('user_id');
            $table->string('role');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['room_id', 'user_id']);
            $table->index(['room_id', 'role']);
            $table->index(['user_id', 'last_seen_at']);

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('worker_supplier_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('worker_id');
            $table->uuid('supplier_id');
            $table->string('status')->default('ACTIVE');
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['room_id', 'worker_id', 'supplier_id']);
            $table->index(['room_id', 'worker_id']);
            $table->index(['room_id', 'supplier_id']);

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('worker_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('supplier_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('room_join_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('worker_id');
            $table->string('status')->default('PENDING');
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('decided_at')->nullable();
            $table->uuid('decided_by_id')->nullable();

            $table->unique(['room_id', 'worker_id']);
            $table->index(['room_id', 'status']);
            $table->index(['worker_id', 'status']);

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('worker_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('phone_verification_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('phone');
            $table->string('code_hash');
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index(['phone', 'expires_at']);

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->uuid('room_id')->nullable();
            $table->uuid('worker_id')->nullable();
            $table->uuid('supplier_id');
            $table->uuid('created_by_supplier_id');
            $table->uuid('store_profile_id');
            $table->decimal('quick_amount', 12, 2)->nullable();
            $table->string('category')->nullable();
            $table->text('note')->nullable();
            $table->string('currency')->default('MAD');
            $table->decimal('grand_total', 12, 2);
            $table->boolean('is_personal')->default(false);
            $table->boolean('immutable')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['room_id', 'created_at']);
            $table->index(['supplier_id', 'is_personal', 'created_at']);

            $table->foreign('room_id')->references('id')->on('rooms')->nullOnDelete();
            $table->foreign('worker_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('supplier_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('created_by_supplier_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('store_profile_id')->references('id')->on('supplier_store_profiles')->cascadeOnDelete();
        });

        Schema::create('document_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('document_id');
            $table->string('product_name');
            $table->decimal('qty', 12, 2);
            $table->string('unit')->nullable();
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->unsignedInteger('position');

            $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('document_id');
            $table->string('file_url');
            $table->string('mime_type');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('document_items');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('phone_verification_codes');
        Schema::dropIfExists('room_join_requests');
        Schema::dropIfExists('worker_supplier_links');
        Schema::dropIfExists('room_members');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('supplier_store_profiles');
        Schema::dropIfExists('api_tokens');
    }
};
