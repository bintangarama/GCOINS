<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32)->nullable();
            $table->string('entity_name', 50);
            $table->string('entity_id', 32);
            $table->string('action', 50);
            $table->string('performed_by_id', 32);
            $table->text('old_values')->nullable();
            $table->text('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('store_id')->references('id')->on('stores')->nullOnDelete();
            $table->foreign('performed_by_id')->references('id')->on('users');

            $table->index(['store_id', 'entity_name', 'entity_id'], 'audit_logs_entity_idx');
            $table->index(['performed_by_id', 'created_at'], 'audit_logs_user_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
