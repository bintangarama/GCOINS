<?php

namespace Database\Factories;

use App\Models\BriSubLedger;
use App\Models\CashOpnameSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BriSubLedger>
 */
class BriSubLedgerFactory extends Factory
{
    protected $model = BriSubLedger::class;

    public function definition(): array
    {
        return [
            'session_id' => CashOpnameSession::factory(),
            'bri_mutation_total_cents' => 0,
            'b2b_allocation_cents' => 0,
            'event_allocation_cents' => 0,
            'aksel_allocation_cents' => 0,
            'anonymous_allocation_cents' => 0,
            'custom_allocations_total_cents' => 0,
            'statement_proof_url' => null,
            'net_kas_kecil_bri_cents' => 0,
        ];
    }
}
