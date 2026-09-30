<?php

namespace Database\Factories;

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OpnameItemCount>
 */
class OpnameItemCountFactory extends Factory
{
    protected $model = OpnameItemCount::class;

    public function definition(): array
    {
        return [
            'session_id' => CashOpnameSession::factory(),
            'item_definition_id' => OpnameItemDefinition::factory(),
            'count' => 0,
            'subtotal_cents' => 0,
        ];
    }
}
