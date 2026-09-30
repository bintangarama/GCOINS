<?php

use App\Actions\Opname\OpenSessionAction;
use App\Models\BriFundPosting;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    StoreOpnameConfig::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000, // Rp 5.000.000
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    // Seed 11 denominations
    $denominations = [
        ['label' => 'Rp 100.000', 'nominal_cents' => 10000000, 'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 1],
        ['label' => 'Rp 50.000',  'nominal_cents' => 5000000,  'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 2],
        ['label' => 'Rp 20.000',  'nominal_cents' => 2000000,  'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 3],
        ['label' => 'Rp 10.000',  'nominal_cents' => 1000000,  'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 4],
        ['label' => 'Rp 5.000',   'nominal_cents' => 500000,   'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 5],
        ['label' => 'Rp 2.000',   'nominal_cents' => 200000,   'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 6],
        ['label' => 'Rp 1.000',   'nominal_cents' => 100000,   'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 7],
        ['label' => 'Rp 1.000',   'nominal_cents' => 100000,   'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 8],
        ['label' => 'Rp 500',     'nominal_cents' => 50000,    'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 9],
        ['label' => 'Rp 200',     'nominal_cents' => 20000,    'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 10],
        ['label' => 'Rp 100',     'nominal_cents' => 10000,    'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 11],
    ];

    foreach ($denominations as $denom) {
        OpnameItemDefinition::create([
            'store_id' => $this->store->id,
            'opname_type' => 'KAS_KECIL',
            'nominal_cents' => $denom['nominal_cents'],
            'group_label' => $denom['group_label'],
            'label' => $denom['label'],
            'unit' => $denom['unit'],
            'sort_order' => $denom['sort_order'],
            'is_active' => true,
        ]);
    }

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC User',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA User',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);
});

test('T-VAR-05: First session: V_prev = 0', function () {
    $action = app(OpenSessionAction::class);
    $session = $action->execute($this->sacUser);

    expect($session)->toBeInstanceOf(CashOpnameSession::class)
        ->and($session->previous_variance_cents)->toBe(0)
        ->and($session->imprest_fund_cents)->toBe(500000000)
        ->and($session->status)->toBe('DRAFT')
        ->and($session->itemCounts)->toHaveCount(11);
});

test('T-VAR-04: Carry-forward: new session reads V_prev from last APPROVED session', function () {
    // Create and approve a previous session with a variance of -25.000 (shortage)
    $prevSession = CashOpnameSession::create([
        'store_id' => $this->store->id,
        'opname_number' => '001/KKCL/10435/IX/2026',
        'opname_type' => 'KAS_KECIL',
        'status' => CashOpnameSession::STATUS_APPROVED,
        'date' => now()->subDay()->toDateString(),
        'imprest_fund_cents' => 500000000,
        'previous_variance_cents' => 0,
        'physical_total_cents' => 497500000,
        'vouchers_total_cents' => 0,
        'bri_clean_balance_cents' => 0,
        'total_actual_cents' => 497500000,
        'target_reconciled_cents' => 500000000,
        'current_variance_cents' => -2500000, // Shortage of Rp 25.000
        'variance_status' => CashOpnameSession::VARIANCE_SHORTAGE,
        'created_by_id' => $this->sacUser->id,
        'approved_by_sm_id' => $this->smUser->id,
        'approved_sm_at' => now()->subHours(12),
    ]);

    $action = app(OpenSessionAction::class);
    $newSession = $action->execute($this->sacUser);

    expect($newSession->previous_variance_cents)->toBe(-2500000)
        ->and($newSession->target_reconciled_cents)->toBe(497500000); // 500000000 + (-2500000)
});

test('T-RBAC-01: SOA cannot open opname session', function () {
    $action = app(OpenSessionAction::class);

    expect(fn () => $action->execute($this->soaUser))
        ->toThrow(AuthorizationException::class);
});

test('OpenSessionAction: auto-populates BRI running balances from APPROVED postings', function () {
    // Seed approved BRI postings
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => 'SMP 1 Karawang',
        'type' => 'INFLOW',
        'amount_cents' => 150000000, // Rp 1.500.000
        'purpose' => 'Pembelian buku',
        'status' => BriFundPosting::STATUS_APPROVED,
        'created_by_id' => $this->sacUser->id,
    ]);

    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'EVENT',
        'entity_name' => 'Bazaar Mall',
        'type' => 'INFLOW',
        'amount_cents' => 50000000, // Rp 500.000
        'purpose' => 'Penjualan bazaar',
        'status' => BriFundPosting::STATUS_APPROVED,
        'created_by_id' => $this->sacUser->id,
    ]);

    $action = app(OpenSessionAction::class);
    $session = $action->execute($this->sacUser);

    expect($session->subLedger)->not->toBeNull()
        ->and($session->subLedger->b2b_allocation_cents)->toBe(150000000)
        ->and($session->subLedger->event_allocation_cents)->toBe(50000000)
        ->and($session->subLedger->net_kas_kecil_bri_cents)->toBe(-200000000); // 0 - 2.000.000
});

test('OpenSessionAction: auto-sums DISBURSED vouchers as K_bon', function () {
    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 75000000, // Rp 750.000
        'purpose' => 'Beli ATK',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
    ]);

    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 25000000, // Rp 250.000
        'purpose' => 'Konsumsi rapat',
        'category' => 'KONSUMSI',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
    ]);

    // Another voucher that is SETTLED (should NOT be counted)
    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 100000000,
        'purpose' => 'Sudah reimburse',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SETTLED,
    ]);

    $action = app(OpenSessionAction::class);
    $session = $action->execute($this->sacUser);

    expect($session->vouchers_total_cents)->toBe(100000000); // Rp 750k + Rp 250k = Rp 1.000.000
});

test('OpenSessionAction: resumes existing DRAFT session instead of creating duplicate', function () {
    $action = app(OpenSessionAction::class);
    $session1 = $action->execute($this->sacUser);
    $session2 = $action->execute($this->sacUser);

    expect($session2->id)->toBe($session1->id)
        ->and(CashOpnameSession::count())->toBe(1);
});
