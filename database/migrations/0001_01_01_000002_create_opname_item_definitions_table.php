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
        Schema::create('opname_item_definitions', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('opname_type', 20);
            $table->string('label', 100);
            $table->bigInteger('nominal_cents');
            $table->string('unit', 20)->default('Lembar');
            $table->string('group_label', 50);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->unique(['store_id', 'opname_type', 'nominal_cents', 'group_label'], 'opname_items_unique_def');
            $table->index(['store_id', 'opname_type', 'is_active'], 'opname_items_active_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opname_item_definitions');
    }
};
