<?php

namespace Database\Factories;

use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Store>
 */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    public function definition(): array
    {
        return [
            'code' => (string) fake()->unique()->numberBetween(10000, 99999),
            'name' => 'Gramedia '.fake()->city(),
            'address' => fake()->address(),
            'is_active' => true,
        ];
    }
}
