<?php

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\OpnameReferenceLine;
use App\Models\Store;
use App\Models\User;
use App\Services\Opname\Reconcilers\CashFlowReconciler;
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
        'opname_number' => 'OPN-KB-10435-261012-001',
        'opname_type' => CashOpnameSession::TYPE_KAS_BESAR,
        'status' => CashOpnameSession::STATUS_DRAFT,
        'date' => now()->toDateString(),
        'imprest_fund_cents' => 0,
        'previous_variance_cents' => 0,
        'created_by_id' => $this->sacUser->id,
    ]);

    $this->reconciler = app(CashFlowReconciler::class);
});

test('CashFlowReconciler calculates Expected Cash = Opening + Sales - Deposits - Payouts', function () {
    // Reference Lines:
    // Opening = Rp 10.000.000 (1.000.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_STOCK_OPENING,
        'reference_number' => 'OPN-PREV',
        'quantity' => 1,
        'amount_cents' => 1000000000,
        'notes' => 'Saldo awal kas besar',
    ]);

    // POS Sales Z-Report = Rp 50.000.000 (5.000.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_Z_REPORT,
        'reference_number' => 'ZR-20261012-01',
        'quantity' => 1,
        'amount_cents' => 5000000000,
        'proof_attachment_url' => 'https://storage.gramedia.id/proofs/zreport-01.pdf',
        'notes' => 'Z-Report POS Kasir 1-5',
    ]);

    // Bank Deposit = Rp 40.000.000 (4.000.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_BANK_DEPOSIT,
        'reference_number' => 'DEP-BRI-8812',
        'quantity' => 1,
        'amount_cents' => 4000000000,
        'proof_attachment_url' => 'https://storage.gramedia.id/proofs/slip-setor-bri.pdf',
        'notes' => 'Setoran cash pickup BRI',
    ]);

    // Payouts = Rp 2.000.000 (200.000.000 cents)
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_PAYOUT,
        'reference_number' => 'PAY-0091',
        'quantity' => 1,
        'amount_cents' => 200000000,
        'notes' => 'Pengeluaran operasional mendesak',
    ]);

    // Expected Cash = 10 + 50 - 40 - 2 = 18.000.000 (1.800.000.000 cents)

    // Physical count = Rp 18.000.000
    $definition = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => CashOpnameSession::TYPE_KAS_BESAR,
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
        'count' => 180,
        'subtotal_cents' => 1800000000, // Rp 18.000.000
    ]);

    $result = $this->reconciler->compute($this->session);

    expect($result->physicalTotalCents)->toBe(1800000000);
    expect($result->vouchersTotalCents)->toBe(0);
    expect($result->briCleanBalanceCents)->toBe(0);
    expect($result->targetCents)->toBe(1800000000);
    expect($result->outstandingVarianceCents)->toBe(0);
    expect($result->varianceStatus)->toBe(CashOpnameSession::VARIANCE_BALANCED);
});

test('CashFlowReconciler assertReadyForSubmission fails if Z-Report or Bank Deposit lines are missing', function () {
    expect(function () {
        $this->reconciler->assertReadyForSubmission($this->session);
    })->toThrow(
        DomainException::class,
        'Bukti Z-Report dan slip setor bank wajib dilampirkan sebelum pengajuan verifikasi Kas Besar.'
    );
});

test('CashFlowReconciler assertReadyForSubmission fails if proof attachment URL is missing', function () {
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_Z_REPORT,
        'reference_number' => 'ZR-001',
        'quantity' => 1,
        'amount_cents' => 100000000,
        'proof_attachment_url' => null, // Missing proof!
    ]);

    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_BANK_DEPOSIT,
        'reference_number' => 'DEP-001',
        'quantity' => 1,
        'amount_cents' => 100000000,
        'proof_attachment_url' => 'https://proofs.com/slip.jpg',
    ]);

    expect(function () {
        $this->reconciler->assertReadyForSubmission($this->session);
    })->toThrow(
        DomainException::class,
        'Bukti Z-Report dan slip setor bank wajib dilampirkan sebelum pengajuan verifikasi Kas Besar.'
    );
});

test('CashFlowReconciler assertReadyForSubmission passes when valid proofs are attached', function () {
    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_Z_REPORT,
        'reference_number' => 'ZR-001',
        'quantity' => 1,
        'amount_cents' => 100000000,
        'proof_attachment_url' => 'https://proofs.com/zreport.jpg',
    ]);

    OpnameReferenceLine::create([
        'session_id' => $this->session->id,
        'line_type' => OpnameReferenceLine::LINE_BANK_DEPOSIT,
        'reference_number' => 'DEP-001',
        'quantity' => 1,
        'amount_cents' => 100000000,
        'proof_attachment_url' => 'https://proofs.com/slip.jpg',
    ]);

    // Should not throw
    $this->reconciler->assertReadyForSubmission($this->session);
    expect(true)->toBeTrue();
});
