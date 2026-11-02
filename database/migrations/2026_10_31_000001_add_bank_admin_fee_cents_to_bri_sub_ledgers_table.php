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
        Schema::table('bri_sub_ledgers', function (Blueprint $table) {
            if (! Schema::hasColumn('bri_sub_ledgers', 'bank_admin_fee_cents')) {
                $table->bigInteger('bank_admin_fee_cents')->default(0)->after('bri_mutation_total_cents');
            }
            if (! Schema::hasColumn('bri_sub_ledgers', 'bank_admin_fee_notes')) {
                $table->string('bank_admin_fee_notes', 255)->nullable()->after('bank_admin_fee_cents');
            }
            if (! Schema::hasColumn('bri_sub_ledgers', 'cleared_by_voucher_id')) {
                $table->string('cleared_by_voucher_id', 32)->nullable()->index()->after('net_kas_kecil_bri_cents');
            }
            if (! Schema::hasColumn('bri_sub_ledgers', 'cleared_at')) {
                $table->timestamp('cleared_at')->nullable()->after('cleared_by_voucher_id');
            }
        });

        Schema::table('petty_cash_vouchers', function (Blueprint $table) {
            if (! Schema::hasColumn('petty_cash_vouchers', 'clears_sub_ledger_id')) {
                $table->string('clears_sub_ledger_id', 32)->nullable()->index()->after('settlement_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('petty_cash_vouchers', 'clears_sub_ledger_id')) {
            Schema::table('petty_cash_vouchers', function (Blueprint $table) {
                $table->dropColumn('clears_sub_ledger_id');
            });
        }

        $columnsToDrop = array_values(array_filter(
            ['bank_admin_fee_cents', 'bank_admin_fee_notes', 'cleared_by_voucher_id', 'cleared_at'],
            fn (string $col) => Schema::hasColumn('bri_sub_ledgers', $col)
        ));

        if (! empty($columnsToDrop)) {
            Schema::table('bri_sub_ledgers', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }
};
