<?php

namespace Database\Factories;

use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OpnameItemDefinition>
 */
class OpnameItemDefinitionFactory extends Factory
{
    protected $model = OpnameItemDefinition::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'opname_type' => CashOpnameSession::TYPE_KAS_KECIL,
            'label' => 'Rp 100.000',
            'nominal_cents' => 10000000,
            'unit' => 'Lembar',
            'group_label' => 'Uang Kertas',
            'sort_order' => 1,
            'is_active' => true,
        ];
    }
}
