<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create opname_reference_lines table
        if (! Schema::hasTable('opname_reference_lines')) {
            Schema::create('opname_reference_lines', function (Blueprint $table) {
                $table->string('id', 32)->primary();
                $table->string('session_id', 32)->index();
                $table->string('line_type', 50)->index();
                $table->string('reference_number', 100)->nullable();
                $table->integer('quantity')->default(0);
                $table->bigInteger('amount_cents')->default(0);
                $table->string('proof_attachment_url')->nullable();
                $table->text('notes')->nullable();
                $table->json('meta_json')->nullable();
                $table->timestamps();

                $table->foreign('session_id')
                    ->references('id')
                    ->on('cash_opname_sessions')
                    ->cascadeOnDelete();
            });
        }

        // 2. Add expected_count and condition to opname_item_counts
        Schema::table('opname_item_counts', function (Blueprint $table) {
            if (! Schema::hasColumn('opname_item_counts', 'expected_count')) {
                $table->integer('expected_count')->default(0);
            }
            if (! Schema::hasColumn('opname_item_counts', 'condition')) {
                $table->string('condition', 20)->default('GOOD');
            }
        });

        // 3. Rename old 'VOUCHER' opname_type to 'GIFT_VOUCHER'
        DB::table('cash_opname_sessions')
            ->where('opname_type', 'VOUCHER')
            ->update(['opname_type' => 'GIFT_VOUCHER']);

        DB::table('opname_item_definitions')
            ->where('opname_type', 'VOUCHER')
            ->update(['opname_type' => 'GIFT_VOUCHER']);

        DB::table('store_opname_configs')
            ->where('opname_type', 'VOUCHER')
            ->update(['opname_type' => 'GIFT_VOUCHER']);

        if (Schema::hasTable('variance_resolutions')) {
            DB::table('variance_resolutions')
                ->where('opname_type', 'VOUCHER')
                ->update(['opname_type' => 'GIFT_VOUCHER']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert opname_type rename
        DB::table('cash_opname_sessions')
            ->where('opname_type', 'GIFT_VOUCHER')
            ->update(['opname_type' => 'VOUCHER']);

        DB::table('opname_item_definitions')
            ->where('opname_type', 'GIFT_VOUCHER')
            ->update(['opname_type' => 'VOUCHER']);

        DB::table('store_opname_configs')
            ->where('opname_type', 'GIFT_VOUCHER')
            ->update(['opname_type' => 'VOUCHER']);

        if (Schema::hasTable('variance_resolutions')) {
            DB::table('variance_resolutions')
                ->where('opname_type', 'GIFT_VOUCHER')
                ->update(['opname_type' => 'VOUCHER']);
        }

        Schema::table('opname_item_counts', function (Blueprint $table) {
            if (Schema::hasColumn('opname_item_counts', 'condition')) {
                $table->dropColumn('condition');
            }
            if (Schema::hasColumn('opname_item_counts', 'expected_count')) {
                $table->dropColumn('expected_count');
            }
        });

        Schema::dropIfExists('opname_reference_lines');
    }
};
