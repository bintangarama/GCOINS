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
        Schema::create('attachments', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('store_id', 32);
            $table->string('entity_type', 30);
            $table->string('entity_id', 32);
            $table->string('category', 30);
            $table->string('file_name', 255);
            $table->string('file_path', 255);
            $table->bigInteger('file_size_bytes');
            $table->string('mime_type', 100);
            $table->string('uploaded_by_id', 32);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('uploaded_by_id')->references('id')->on('users');

            $table->index(['entity_type', 'entity_id'], 'attachments_entity_idx');
            $table->index('store_id', 'attachments_store_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
