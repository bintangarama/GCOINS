<?php

use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use App\Services\BriBalanceService;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->user = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Officer',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->user->syncRoles(['SAC']);

    $this->balanceService = app(BriBalanceService::class);
});

test('T-BRI-01: Running balance = Σ INFLOW(approved) - Σ OUTFLOW(approved)', function () {
    $entityName = 'SMA Negeri 1 Karawang';

    // Inflow 1: Rp 1.000.000 (100000000 cents) APPROVED
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pembayaran buku kurikulum tahap 1',
        'status' => 'APPROVED',
        'created_by_id' => $this->user->id,
    ]);

    // Inflow 2: Rp 500.000 (50000000 cents) APPROVED
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 50000000,
        'purpose' => 'Pembayaran buku kurikulum tahap 2',
        'status' => 'APPROVED',
        'created_by_id' => $this->user->id,
    ]);

    // Outflow 1: Rp 300.000 (30000000 cents) APPROVED
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'OUTFLOW',
        'amount_cents' => 30000000,
        'purpose' => 'Pengembalian selisih lebih transfer',
        'status' => 'APPROVED',
        'created_by_id' => $this->user->id,
    ]);

    // Running balance should be: (1.000.000 + 500.000) - 300.000 = 1.200.000 (120000000 cents)
    $balance = $this->balanceService->getEntityBalance($this->store->id, $entityName, 'B2B');
    expect($balance)->toBe(120000000);

    // Category balance should also match
    $categoryBalance = $this->balanceService->getCategoryBalance($this->store->id, 'B2B');
    expect($categoryBalance)->toBe(120000000);
});

test('T-BRI-02: K_bri = mutation - Σ allocations', function () {
    // Mutation from bank statement: Rp 10.000.000 (1.000.000.000 cents)
    $mutationBalanceCents = 1000000000;

    // Total non-petty-cash allocations (B2B, EVENT, AKSEL, ANONYMOUS, CUSTOM): Rp 4.500.000
    $totalAllocationsCents = 450000000;

    // K_bri formula: mutation - total allocations
    $kBri = $this->balanceService->calculatePettyCashPortion($mutationBalanceCents, $totalAllocationsCents);

    // Expected K_bri: 10.000.000 - 4.500.000 = Rp 5.500.000 (550.000.000 cents)
    expect($kBri)->toBe(550000000);
});

test('T-BRI-01 (Category Aggregation): S_category = Σ S_entity for all entities in category', function () {
    // Entity 1 in EVENT: Rp 2.000.000
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'EVENT',
        'entity_name' => 'Gramedia Book Fair Mall A',
        'type' => 'INFLOW',
        'amount_cents' => 200000000,
        'purpose' => 'Hasil penjualan bazaar Mall A',
        'status' => 'APPROVED',
        'created_by_id' => $this->user->id,
    ]);

    // Entity 2 in EVENT: Inflow Rp 1.500.000, Outflow Rp 500.000 -> Balance Rp 1.000.000
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'EVENT',
        'entity_name' => 'Gramedia Exhibition Mall B',
        'type' => 'INFLOW',
        'amount_cents' => 150000000,
        'purpose' => 'Hasil penjualan bazaar Mall B',
        'status' => 'APPROVED',
        'created_by_id' => $this->user->id,
    ]);

    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'EVENT',
        'entity_name' => 'Gramedia Exhibition Mall B',
        'type' => 'OUTFLOW',
        'amount_cents' => 50000000,
        'purpose' => 'Biaya operasional sewa booth Mall B',
        'status' => 'APPROVED',
        'created_by_id' => $this->user->id,
    ]);

    $categoryBalance = $this->balanceService->getCategoryBalance($this->store->id, 'EVENT');
    expect($categoryBalance)->toBe(300000000); // Rp 3.000.000

    $allBalances = $this->balanceService->getAllCategoryBalances($this->store->id);
    expect($allBalances['EVENT'])->toBe(300000000);
    expect($allBalances['TOTAL'])->toBe(300000000);
});
