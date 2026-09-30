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
        Schema::create('opname_item_counts', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('session_id', 32);
            $table->string('item_definition_id', 32);
            $table->integer('count')->default(0);
            $table->bigInteger('subtotal_cents')->default(0);
            $table->timestamps();

            $table->foreign('session_id')->references('id')->on('cash_opname_sessions')->cascadeOnDelete();
            $table->foreign('item_definition_id')->references('id')->on('opname_item_definitions');
            $table->unique(['session_id', 'item_definition_id'], 'opname_counts_session_item_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opname_item_counts');
    }
};
