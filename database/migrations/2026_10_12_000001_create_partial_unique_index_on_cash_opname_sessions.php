<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS uq_active_opname_session ON cash_opname_sessions (store_id, opname_type) WHERE status IN ('DRAFT', 'SUBMITTED', 'VERIFIED_SS');");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_active_opname_session;');
    }
};
