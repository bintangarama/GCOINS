<?php

namespace Database\Factories;

use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BriFundPosting>
 */
class BriFundPostingFactory extends Factory
{
    protected $model = BriFundPosting::class;

    public function definition(): array
    {
        $store = Store::first() ?? Store::factory()->create();
        $user = User::where('store_id', $store->id)->first() ?? User::factory()->create([
            'store_id' => $store->id,
            'role' => 'SAC',
        ]);

        return [
            'store_id' => $store->id,
            'category' => fake()->randomElement(['B2B', 'EVENT', 'AKSEL', 'ANONYMOUS']),
            'custom_category_name' => null,
            'entity_name' => fake()->company(),
            'type' => BriFundPosting::TYPE_INFLOW,
            'amount_cents' => fake()->numberBetween(1000000, 50000000), // Rp 10.000 to Rp 500.000
            'purpose' => fake()->sentence(4),
            'proof_attachment_url' => '/storage/bri-postings/proof_sample.webp',
            'status' => BriFundPosting::STATUS_APPROVED,
            'created_by_id' => $user->id,
            'approved_by_id' => null,
            'approved_at' => null,
            'rejection_reason' => null,
        ];
    }

    public function inflow(): static
    {
        return $this->state(fn () => [
            'type' => BriFundPosting::TYPE_INFLOW,
            'status' => BriFundPosting::STATUS_APPROVED,
        ]);
    }

    public function outflow(): static
    {
        return $this->state(fn () => [
            'type' => BriFundPosting::TYPE_OUTFLOW,
            'status' => BriFundPosting::STATUS_PENDING_SS,
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'status' => BriFundPosting::STATUS_PENDING_SS,
            'approved_by_id' => null,
            'approved_at' => null,
        ]);
    }

    public function approved(?User $approver = null): static
    {
        return $this->state(function (array $attributes) use ($approver) {
            $approverId = $approver?->id ?? User::where('store_id', $attributes['store_id'])
                ->whereIn('role', ['SS', 'SM'])
                ->first()?->id;

            return [
                'status' => BriFundPosting::STATUS_APPROVED,
                'approved_by_id' => $approverId,
                'approved_at' => now(),
            ];
        });
    }

    public function rejected(string $reason = 'Bukti mutasi tidak valid', ?User $rejector = null): static
    {
        return $this->state(function (array $attributes) use ($reason, $rejector) {
            $rejectorId = $rejector?->id ?? User::where('store_id', $attributes['store_id'])
                ->whereIn('role', ['SS', 'SM'])
                ->first()?->id;

            return [
                'status' => BriFundPosting::STATUS_REJECTED,
                'rejection_reason' => $reason,
                'approved_by_id' => $rejectorId,
                'approved_at' => now(),
            ];
        });
    }

    public function category(string $category, ?string $customCategoryName = null): static
    {
        return $this->state(fn () => [
            'category' => $category,
            'custom_category_name' => $category === BriFundPosting::CATEGORY_CUSTOM ? ($customCategoryName ?? 'Sewa Booth') : null,
        ]);
    }
}
