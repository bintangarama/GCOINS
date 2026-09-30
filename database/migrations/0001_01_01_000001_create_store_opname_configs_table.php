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
        Schema::create('store_opname_configs', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('opname_type', 20);
            $table->bigInteger('imprest_fund_cents')->default(500000000);
            $table->string('reconciliation_mode', 20)->default('THREE_POCKETS');
            $table->boolean('has_voucher_integration')->default(true);
            $table->boolean('has_bank_reconciliation')->default(true);
            $table->boolean('is_active')->default(true);
            $table->text('config_json')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->unique(['store_id', 'opname_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_opname_configs');
    }
};
