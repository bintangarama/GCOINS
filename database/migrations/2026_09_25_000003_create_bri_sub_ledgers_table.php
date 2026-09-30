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
        Schema::create('bri_sub_ledgers', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('session_id', 32)->unique();
            $table->bigInteger('bri_mutation_total_cents')->default(0);
            $table->bigInteger('b2b_allocation_cents')->default(0);
            $table->bigInteger('event_allocation_cents')->default(0);
            $table->bigInteger('aksel_allocation_cents')->default(0);
            $table->bigInteger('anonymous_allocation_cents')->default(0);
            $table->bigInteger('custom_allocations_total_cents')->default(0);
            $table->string('statement_proof_url', 255)->nullable();
            $table->bigInteger('net_kas_kecil_bri_cents')->default(0);
            $table->timestamps();

            $table->foreign('session_id')->references('id')->on('cash_opname_sessions')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bri_sub_ledgers');
    }
};
