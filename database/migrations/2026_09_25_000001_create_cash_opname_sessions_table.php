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
        Schema::create('cash_opname_sessions', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('opname_number', 50)->unique();
            $table->string('opname_type', 20)->default('KAS_KECIL');
            $table->string('status', 20)->default('DRAFT');
            $table->date('date');
            $table->bigInteger('imprest_fund_cents')->default(500000000);
            $table->bigInteger('previous_variance_cents')->default(0);
            $table->bigInteger('physical_total_cents')->default(0);
            $table->bigInteger('vouchers_total_cents')->default(0);
            $table->bigInteger('bri_clean_balance_cents')->default(0);
            $table->bigInteger('total_actual_cents')->default(0);
            $table->bigInteger('target_reconciled_cents')->default(500000000);
            $table->bigInteger('current_variance_cents')->default(0);
            $table->string('variance_status', 10)->default('BALANCED');
            $table->string('created_by_id', 32);
            $table->string('verified_by_ss_id', 32)->nullable();
            $table->string('approved_by_sm_id', 32)->nullable();
            $table->dateTime('verified_ss_at')->nullable();
            $table->dateTime('approved_sm_at')->nullable();
            $table->string('generated_excel_url', 255)->nullable();
            $table->string('generated_pdf_url', 255)->nullable();
            $table->string('signed_ba_scan_url', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('created_by_id')->references('id')->on('users');
            $table->foreign('verified_by_ss_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by_sm_id')->references('id')->on('users')->nullOnDelete();

            $table->index(['store_id', 'opname_type', 'status'], 'opname_sessions_status_idx');
            $table->index(['store_id', 'opname_type', 'status', 'approved_sm_at'], 'opname_sessions_approved_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_opname_sessions');
    }
};
