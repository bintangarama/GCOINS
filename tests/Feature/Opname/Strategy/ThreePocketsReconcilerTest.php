<?php

use App\Models\BriSubLedger;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use App\Models\VarianceResolution;
use App\Services\Opname\Reconcilers\ThreePocketsReconciler;
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
    $this->actingAs($this->sacUser);

    $this->session = CashOpnameSession::create([
        'store_id' => $this->store->id,
        'opname_number' => 'OPN-10435-261012-001',
        'opname_type' => CashOpnameSession::TYPE_KAS_KECIL,
        'status' => CashOpnameSession::STATUS_DRAFT,
        'date' => now()->toDateString(),
        'imprest_fund_cents' => 500000000, // Rp 5.000.000
        'previous_variance_cents' => 0,
        'created_by_id' => $this->sacUser->id,
    ]);

    $this->reconciler = app(ThreePocketsReconciler::class);
});

test('ThreePocketsReconciler calculates K_fisik, K_bon, and K_bri correctly', function () {
    // 1. K_fisik (Denominations) = Rp 3.000.000
    $definition = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_KAS_KECIL,
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
        'count' => 30,
        'subtotal_cents' => 300000000, // Rp 3.000.000
    ]);

    // 2. K_bon (Disbursed Vouchers) = Rp 1.000.000
    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => 'VCH-001',
        'amount_cents' => 100000000,
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'requester_id' => $this->sacUser->id,
        'category' => 'OPS',
        'purpose' => 'Pembelian ATK',
    ]);

    // 3. K_bri (Net Kas Kecil in Bank BRI) = Rp 1.000.000
    BriSubLedger::create([
        'session_id' => $this->session->id,
        'bri_mutation_total_cents' => 100000000,
        'b2b_allocation_cents' => 0,
        'event_allocation_cents' => 0,
        'aksel_allocation_cents' => 0,
        'anonymous_allocation_cents' => 0,
        'custom_allocations_total_cents' => 0,
        'net_kas_kecil_bri_cents' => 100000000,
    ]);

    $result = $this->reconciler->compute($this->session);

    expect($result->physicalTotalCents)->toBe(300000000);
    expect($result->vouchersTotalCents)->toBe(100000000);
    expect($result->briCleanBalanceCents)->toBe(100000000);
    expect($result->totalActualCents)->toBe(500000000);
    expect($result->targetCents)->toBe(500000000);
    expect($result->rawDiscrepancyCents)->toBe(0);
    expect($result->outstandingVarianceCents)->toBe(0);
    expect($result->varianceStatus)->toBe(CashOpnameSession::VARIANCE_BALANCED);
});

test('ThreePocketsReconciler computes outstanding variance with approved resolution', function () {
    // Physical = Rp 4.500.000, Vouchers = 0, BRI = 0. Imprest = Rp 5.000.000.
    $definition = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_KAS_KECIL,
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    OpnameItemCount::create([
        'session_id' => $this->session->id,
        'item_definition_id' => $definition->id,
        'count' => 45,
        'subtotal_cents' => 450000000, // Rp 4.500.000
    ]);

    // Initial variance = -500.000
    $result1 = $this->reconciler->compute($this->session);
    expect($result1->rawDiscrepancyCents)->toBe(-50000000);
    expect($result1->outstandingVarianceCents)->toBe(-50000000);
    expect($result1->varianceStatus)->toBe(CashOpnameSession::VARIANCE_SHORTAGE);

    // Kasir mengganti Rp 500.000 (Approved REPLACED resolution)
    VarianceResolution::create([
        'store_id' => $this->store->id,
        'session_id' => $this->session->id,
        'opname_type' => CashOpnameSession::TYPE_KAS_KECIL,
        'kind' => VarianceResolution::KIND_REPLACED,
        'amount_cents' => 50000000,
        'status' => VarianceResolution::STATUS_APPROVED,
        'reason' => 'Kasir mengganti selisih',
        'created_by_id' => $this->sacUser->id,
        'resolved_by_id' => $this->sacUser->id,
        'notes' => 'Kasir mengganti selisih',
    ]);

    $result2 = $this->reconciler->compute($this->session);
    expect($result2->rawDiscrepancyCents)->toBe(-50000000);
    expect($result2->cumulativeResolvedCents)->toBe(50000000);
    expect($result2->outstandingVarianceCents)->toBe(0);
    expect($result2->varianceStatus)->toBe(CashOpnameSession::VARIANCE_BALANCED);
});

test('ThreePocketsReconciler asserts ready for submission throws exception when counts are missing', function () {
    expect(function () {
        $this->reconciler->assertReadyForSubmission($this->session);
    })->toThrow(DomainException::class, 'Perhitungan fisik pecahan uang kas belum diisi.');
});
