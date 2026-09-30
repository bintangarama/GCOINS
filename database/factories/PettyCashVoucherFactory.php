<?php

namespace Database\Factories;

use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use App\Services\DocumentNumberGenerator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PettyCashVoucher>
 */
class PettyCashVoucherFactory extends Factory
{
    protected $model = PettyCashVoucher::class;

    public function definition(): array
    {
        $store = Store::first() ?? Store::factory()->create();
        $user = User::where('store_id', $store->id)->first() ?? User::create([
            'store_id' => $store->id,
            'nik' => 'SOA'.fake()->unique()->numerify('###'),
            'name' => fake()->name(),
            'role' => 'SOA',
            'pin_hash' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            'is_active' => true,
        ]);

        $generator = app(DocumentNumberGenerator::class);
        $voucherNumber = $generator->generateVoucherNumber($store);

        return [
            'store_id' => $store->id,
            'voucher_number' => $voucherNumber,
            'requester_id' => $user->id,
            'amount_cents' => fake()->numberBetween(1000000, 50000000), // Rp 10.000 to Rp 500.000
            'purpose' => fake()->sentence(4),
            'category' => fake()->randomElement(['OPERASIONAL', 'STRUK_KASIR', 'LOGISTIK', 'KONSUMSI', 'MAINTENANCE', 'LAINNYA']),
            'status' => 'DRAFT',
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
            'item_photo_url' => null,
            'approved_by_id' => null,
            'approved_at' => null,
            'disbursed_by_id' => null,
            'disbursed_at' => null,
            'settled_at' => null,
            'rejection_reason' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'status' => 'DRAFT',
        ]);
    }

    public function submitted(): static
    {
        return $this->state(fn () => [
            'status' => 'SUBMITTED',
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
        ]);
    }

    public function approved(User $approver): static
    {
        return $this->state(fn () => [
            'status' => 'APPROVED_SS',
            'approved_by_id' => $approver->id,
            'approved_at' => now(),
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
        ]);
    }

    public function disbursed(User $approver, User $disburser): static
    {
        return $this->state(fn () => [
            'status' => 'DISBURSED',
            'approved_by_id' => $approver->id,
            'approved_at' => now()->subHours(2),
            'disbursed_by_id' => $disburser->id,
            'disbursed_at' => now()->subHour(),
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
        ]);
    }

    public function settled(User $approver, User $disburser): static
    {
        return $this->state(fn () => [
            'status' => 'SETTLED',
            'approved_by_id' => $approver->id,
            'approved_at' => now()->subDays(2),
            'disbursed_by_id' => $disburser->id,
            'disbursed_at' => now()->subDay(),
            'settled_at' => now(),
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
        ]);
    }

    public function rejected(User $rejecter, string $reason = 'Kuitansi tidak valid'): static
    {
        return $this->state(fn () => [
            'status' => 'REJECTED',
            'approved_by_id' => $rejecter->id,
            'rejection_reason' => $reason,
        ]);
    }

    public function rejectedRefundPending(User $approver, User $disburser): static
    {
        return $this->state(fn () => [
            'status' => 'REJECTED_REFUND_PENDING',
            'approved_by_id' => $approver->id,
            'approved_at' => now()->subDays(2),
            'disbursed_by_id' => $disburser->id,
            'disbursed_at' => now()->subDay(),
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
        ]);
    }

    public function refunded(User $approver, User $disburser): static
    {
        return $this->state(fn () => [
            'status' => 'REFUNDED',
            'approved_by_id' => $approver->id,
            'approved_at' => now()->subDays(3),
            'disbursed_by_id' => $disburser->id,
            'disbursed_at' => now()->subDays(2),
            'receipt_image_url' => '/storage/vouchers/receipt_sample.webp',
        ]);
    }
}
