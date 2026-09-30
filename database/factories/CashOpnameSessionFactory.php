<?php

namespace Database\Factories;

use App\Models\CashOpnameSession;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CashOpnameSession>
 */
class CashOpnameSessionFactory extends Factory
{
    protected $model = CashOpnameSession::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'opname_number' => sprintf('%03d/KKCL/10435/IX/2026', fake()->unique()->numberBetween(1, 999)),
            'opname_type' => CashOpnameSession::TYPE_KAS_KECIL,
            'status' => CashOpnameSession::STATUS_DRAFT,
            'date' => now()->toDateString(),
            'imprest_fund_cents' => 500000000,
            'previous_variance_cents' => 0,
            'physical_total_cents' => 0,
            'vouchers_total_cents' => 0,
            'bri_clean_balance_cents' => 0,
            'total_actual_cents' => 0,
            'target_reconciled_cents' => 500000000,
            'current_variance_cents' => -500000000,
            'variance_status' => CashOpnameSession::VARIANCE_SHORTAGE,
            'created_by_id' => User::factory(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CashOpnameSession::STATUS_APPROVED,
            'approved_sm_at' => now(),
            'variance_status' => CashOpnameSession::VARIANCE_BALANCED,
            'current_variance_cents' => 0,
        ]);
    }
}
