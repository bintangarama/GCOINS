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
        Schema::create('petty_cash_vouchers', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('voucher_number', 50)->unique();
            $table->string('requester_id', 32);
            $table->bigInteger('amount_cents');
            $table->string('purpose', 255);
            $table->string('category', 20)->default('OPERASIONAL');
            $table->string('status', 30)->default('DRAFT');
            $table->string('receipt_image_url', 255)->nullable();
            $table->string('item_photo_url', 255)->nullable();
            $table->string('approved_by_id', 32)->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->string('disbursed_by_id', 32)->nullable();
            $table->dateTime('disbursed_at')->nullable();
            $table->dateTime('settled_at')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('requester_id')->references('id')->on('users');
            $table->foreign('approved_by_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('disbursed_by_id')->references('id')->on('users')->nullOnDelete();

            $table->index(['store_id', 'status'], 'vouchers_store_status_idx');
            $table->index(['store_id', 'requester_id', 'status'], 'vouchers_requester_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_vouchers');
    }
};
