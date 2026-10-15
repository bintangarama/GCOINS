<?php

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\OpnameReferenceLine;
use App\Models\Store;
use App\Models\User;
use App\Services\Opname\Reconcilers\SerialStockReconciler;
use Database\Seeders\RoleAndPermissionSeeder;
use DomainException;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Officer',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->session = CashOpnameSession::create([
        'store_id' => $this->store->id,
        'opname_number' => 'OPN-GV-10435-261012-001',
        'opname_type' => CashOpnameSession::TYPE_GIFT_VOUCHER,
        'status' => CashOpnameSession::STATUS_DRAFT,
        'date' => now()->toDateString(),
        'imprest_fund_cents' => 0,
        'previous_variance_cents' => 0,
        'created_by_id' => $this->sacUser->id,
    ]);

    $this->reconciler = app(SerialStockReconciler::class);
});

test('SerialStockReconciler reconciles physical count per denomination against serial range reference line', function () {
    $definition100k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_GIFT_VOUCHER,
        'nominal_cents' => 10000000, // Rp 100.000
        'group_label' => 'Gift Voucher',
        'label' => 'Gift Voucher Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $definition50k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_GIFT_VOUCHER,
        'nominal_cents' => 5000000, // Rp 50.000
        'group_label' => 'Gift Voucher',
        'label' => 'Gift Voucher Rp 50.000',
        'unit' => 'Lembar',
        'sort_order' => 2,
        'is_active' => true,
    ]);

    // Active serial range reference lines:
    // 100 lembar @ 100k (Seri GV100-001 s/d GV100-100) = Rp 10.000.000 (1.000.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_SERIAL_RANGE,
        'reference_number' => 'GV100-001 s/d GV100-100',
        'quantity' => 100,
        'amount_cents' => 1000000000,
        'notes' => 'Stok aktif voucher nominal 100rb',
    ]);

    // 50 lembar @ 50k (Seri GV50-001 s/d GV50-050) = Rp 2.500.000 (250.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_SERIAL_RANGE,
        'reference_number' => 'GV50-001 s/d GV50-050',
        'quantity' => 50,
        'amount_cents' => 250000000,
        'notes' => 'Stok aktif voucher nominal 50rb',
    ]);

    // Physical count:
    // 100 lembar @ 100k
    OpnameItemCount::create([
        'session_id' => $this->session->id,
        'item_definition_id' => $definition100k->id,
        'count' => 100,
        'subtotal_cents' => 1000000000,
        'expected_count' => 100,
    ]);

    // 49 lembar @ 50k (Kurang 1 lembar Rp 50.000)
    OpnameItemCount::create([
        'session_id' => $this->session->id,
        'item_definition_id' => $definition50k->id,
        'count' => 49,
        'subtotal_cents' => 245000000,
        'expected_count' => 50,
    ]);

    $result = $this->reconciler->compute($this->session);

    expect($result->physicalTotalCents)->toBe(1245000000);
    expect($result->targetCents)->toBe(1250000000);
    expect($result->rawDiscrepancyCents)->toBe(-5000000); // Shortage Rp 50.000
    expect($result->outstandingVarianceCents)->toBe(-5000000);
    expect($result->varianceStatus)->toBe(CashOpnameSession::VARIANCE_SHORTAGE);
    expect($result->meta['physical_voucher_quantity'])->toBe(149);
    expect($result->meta['serial_range_lines_count'])->toBe(2);
});

test('SerialStockReconciler assertReadyForSubmission fails when physical counts are missing', function () {
    expect(function () {
        $this->reconciler->assertReadyForSubmission($this->session);
    })->toThrow(DomainException::class, 'Pencacahan fisik stok gift voucher belum diisi.');
});
