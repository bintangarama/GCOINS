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
        Schema::create('bri_fund_postings', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('category', 20);
            $table->string('custom_category_name', 100)->nullable();
            $table->string('entity_name', 150);
            $table->string('type', 10);
            $table->bigInteger('amount_cents');
            $table->string('purpose', 255);
            $table->string('proof_attachment_url', 255)->nullable();
            $table->string('status', 15);
            $table->string('created_by_id', 32);
            $table->string('approved_by_id', 32)->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('created_by_id')->references('id')->on('users');
            $table->foreign('approved_by_id')->references('id')->on('users')->nullOnDelete();

            $table->index(['store_id', 'category', 'status'], 'bri_postings_cat_status_idx');
            $table->index(['store_id', 'entity_name', 'status'], 'bri_postings_entity_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bri_fund_postings');
    }
};
