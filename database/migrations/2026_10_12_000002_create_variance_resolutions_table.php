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
        Schema::create('variance_resolutions', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('session_id', 32);
            $table->string('opname_type', 20);
            $table->string('kind', 20); // 'REPLACED', 'WRITE_OFF', 'FOUND'
            $table->bigInteger('amount_cents');
            $table->text('reason');
            $table->string('proof_attachment_url', 255)->nullable();
            $table->string('status', 20)->default('PENDING'); // 'PENDING', 'APPROVED', 'REJECTED'
            $table->string('created_by_id', 32);
            $table->string('approved_by_id', 32)->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('session_id')->references('id')->on('cash_opname_sessions')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users');
            $table->foreign('approved_by_id')->references('id')->on('users');

            $table->index(['store_id', 'opname_type', 'status'], 'idx_resolutions_store_type_status');
            $table->index('session_id', 'idx_resolutions_session_id');
        });

        Schema::table('cash_opname_sessions', function (Blueprint $table) {
            $table->bigInteger('raw_discrepancy_cents')->default(0)->after('target_reconciled_cents');
            $table->bigInteger('cumulative_resolved_cents')->default(0)->after('raw_discrepancy_cents');
            $table->bigInteger('outstanding_variance_cents')->default(0)->after('cumulative_resolved_cents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_opname_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'raw_discrepancy_cents',
                'cumulative_resolved_cents',
                'outstanding_variance_cents',
            ]);
        });

        Schema::dropIfExists('variance_resolutions');
    }
};
