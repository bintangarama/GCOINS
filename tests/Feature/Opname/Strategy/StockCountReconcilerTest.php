<?php

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\OpnameReferenceLine;
use App\Models\Store;
use App\Models\User;
use App\Services\Opname\Reconcilers\StockCountReconciler;
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
        'opname_number' => 'OPN-MAT-10435-261012-001',
        'opname_type' => CashOpnameSession::TYPE_MATERAI,
        'status' => CashOpnameSession::STATUS_DRAFT,
        'date' => now()->toDateString(),
        'imprest_fund_cents' => 0,
        'previous_variance_cents' => 0,
        'created_by_id' => $this->sacUser->id,
    ]);

    $this->reconciler = app(StockCountReconciler::class);
});

test('StockCountReconciler counts only GOOD condition for Physical and Book Stock = Opening + Received - Used - Damaged', function () {
    $definitionGood = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_MATERAI,
        'nominal_cents' => 1000000, // Rp 10.000 per lembar materai
        'group_label' => 'Stok Materai',
        'label' => 'Materai Rp 10.000 (Baik)',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $definitionDamaged = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_MATERAI,
        'nominal_cents' => 1000000,
        'group_label' => 'Stok Rusak',
        'label' => 'Materai Rp 10.000 (Rusak)',
        'unit' => 'Lembar',
        'sort_order' => 2,
        'is_active' => true,
    ]);

    // Physical count:
    // 100 lembar kondisi GOOD
    OpnameItemCount::create([
        'session_id' => $this->session->id,
        'item_definition_id' => $definitionGood->id,
        'count' => 100,
        'subtotal_cents' => 100000000, // Rp 1.000.000
        'condition' => OpnameItemCount::CONDITION_GOOD,
        'expected_count' => 100,
    ]);

    // 5 lembar kondisi DAMAGED (rusak fisik)
    OpnameItemCount::create([
        'session_id' => $this->session->id,
        'item_definition_id' => $definitionDamaged->id,
        'count' => 5,
        'subtotal_cents' => 5000000, // Rp 50.000
        'condition' => OpnameItemCount::CONDITION_DAMAGED,
        'expected_count' => 0,
    ]);

    // Book Stock Reference Lines:
    // Opening = 100 lembar (Rp 1.000.000 = 100.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STOCK_OPENING,
        'reference_number' => 'MAT-OPENING',
        'quantity' => 100,
        'amount_cents' => 100000000,
    ]);

    // Received = 50 lembar (Rp 500.000 = 50.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STOCK_RECEIVED,
        'reference_number' => 'MAT-RCV-01',
        'quantity' => 50,
        'amount_cents' => 50000000,
    ]);

    // Used = 45 lembar (Rp 450.000 = 45.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STOCK_USED,
        'reference_number' => 'MAT-USED-01',
        'quantity' => 45,
        'amount_cents' => 45000000,
    ]);

    // Damaged recorded = 5 lembar (Rp 50.000 = 5.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STOCK_DAMAGED,
        'reference_number' => 'MAT-DMG-01',
        'quantity' => 5,
        'amount_cents' => 5000000,
    ]);

    // Book stock target = 100 + 50 - 45 - 5 = 100 lembar (100.000.000 cents)
    $result = $this->reconciler->compute($this->session);

    // Only GOOD condition is counted as physical actual
    expect($result->physicalTotalCents)->toBe(100000000);
    expect($result->totalActualCents)->toBe(100000000);
    expect($result->targetCents)->toBe(100000000);
    expect($result->outstandingVarianceCents)->toBe(0);
    expect($result->varianceStatus)->toBe(CashOpnameSession::VARIANCE_BALANCED);
    expect($result->meta['good_quantity'])->toBe(100);
    expect($result->meta['damaged_quantity'])->toBe(5);
});

test('StockCountReconciler assertReadyForSubmission fails when counts are empty', function () {
    expect(function () {
        $this->reconciler->assertReadyForSubmission($this->session);
    })->toThrow(DomainException::class, 'Pencacahan fisik stok materai belum diisi.');
});
