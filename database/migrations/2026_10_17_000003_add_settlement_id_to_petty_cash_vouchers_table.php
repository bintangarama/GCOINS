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
        Schema::table('petty_cash_vouchers', function (Blueprint $table) {
            $table->string('settlement_id', 32)->nullable()->after('store_id');
            $table->foreign('settlement_id')->references('id')->on('petty_cash_settlements')->nullOnDelete();
            $table->index('settlement_id', 'vouchers_settlement_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('petty_cash_vouchers', function (Blueprint $table) {
            $table->dropForeign(['settlement_id']);
            $table->dropIndex('vouchers_settlement_idx');
            $table->dropColumn('settlement_id');
        });
    }
};
