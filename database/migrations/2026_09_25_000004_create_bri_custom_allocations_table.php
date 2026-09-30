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
        Schema::create('bri_custom_allocations', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('sub_ledger_id', 32);
            $table->string('name', 100);
            $table->bigInteger('amount_cents')->default(0);
            $table->string('notes', 255)->nullable();
            $table->string('proof_attachment_url', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('sub_ledger_id')->references('id')->on('bri_sub_ledgers')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bri_custom_allocations');
    }
};
