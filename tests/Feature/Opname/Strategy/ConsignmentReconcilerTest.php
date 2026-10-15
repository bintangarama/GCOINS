<?php

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\OpnameReferenceLine;
use App\Models\Store;
use App\Models\User;
use App\Services\Opname\Reconcilers\ConsignmentReconciler;
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
        'opname_number' => 'OPN-ACT-10435-261012-001',
        'opname_type' => CashOpnameSession::TYPE_ACTIVE_SELLING,
        'status' => CashOpnameSession::STATUS_DRAFT,
        'date' => now()->toDateString(),
        'imprest_fund_cents' => 0,
        'previous_variance_cents' => 0,
        'created_by_id' => $this->sacUser->id,
    ]);

    $this->reconciler = app(ConsignmentReconciler::class);
});

test('ConsignmentReconciler calculates Expected = Modal Awal + Hasil Jual - Biaya - Setor Toko', function () {
    // 1. Modal Awal: Rp 1.000.000 (100.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STOCK_OPENING,
        'reference_number' => 'MODAL-001',
        'amount_cents' => 100000000,
        'notes' => 'Modal kas awal pameran',
    ]);

    // 2. Hasil Jual Konsinyasi: Rp 5.000.000 (500.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_CONSIGNMENT_SALES,
        'reference_number' => 'SALES-EVT-01',
        'amount_cents' => 500000000,
        'notes' => 'Omzet penjualan booth event',
    ]);

    // 3. Biaya Event: Rp 500.000 (50.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_EVENT_EXPENSE,
        'reference_number' => 'EXP-001',
        'amount_cents' => 50000000,
        'notes' => 'Konsumsi & transport tim bazaar',
    ]);

    // 4. Setor Toko: Rp 4.000.000 (400.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STORE_REMITTANCE,
        'reference_number' => 'REMIT-001',
        'amount_cents' => 400000000,
        'notes' => 'Setoran parsial ke kasir toko',
    ]);

    // Target Expected = 1.000.000 + 5.000.000 - 500.000 - 4.000.000 = Rp 1.500.000 (150.000.000 cents)

    // Physical count = Rp 1.500.000
    $definition = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_ACTIVE_SELLING,
        'nominal_cents' => 10000000, // Rp 100.000
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    OpnameItemCount::create([
        'session_id' => $this->session->id,
        'item_definition_id' => $definition->id,
        'count' => 15,
        'subtotal_cents' => 150000000,
    ]);

    $result = $this->reconciler->compute($this->session);

    expect($result->physicalTotalCents)->toBe(150000000);
    expect($result->totalActualCents)->toBe(150000000);
    expect($result->targetCents)->toBe(150000000);
    expect($result->outstandingVarianceCents)->toBe(0);
    expect($result->varianceStatus)->toBe(CashOpnameSession::VARIANCE_BALANCED);
});

test('ConsignmentReconciler assertReadyForSubmission fails when physical counts are missing', function () {
    expect(function () {
        $this->reconciler->assertReadyForSubmission($this->session);
    })->toThrow(DomainException::class, 'Perhitungan fisik kas hasil active selling belum diisi.');
});
