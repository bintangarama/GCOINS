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
        Schema::create('petty_cash_settlements', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('settlement_number', 50)->unique();
            $table->bigInteger('total_amount_cents')->default(0);
            $table->string('status', 30)->default('SETTLED');
            $table->string('settled_by_id', 32);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('settled_by_id')->references('id')->on('users');
            $table->index(['store_id', 'created_at'], 'settlements_store_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_settlements');
    }
};
