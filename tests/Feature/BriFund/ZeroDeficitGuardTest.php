<?php

use App\Actions\BriFund\ApproveOutflowAction;
use App\Actions\BriFund\CreatePostingAction;
use App\Exceptions\InsufficientRunningBalanceException;
use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use App\Services\BriBalanceService;
use Database\Seeders\RoleAndPermissionSeeder;
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

    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Store Supervisor',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    $this->createAction = app(CreatePostingAction::class);
    $this->approveAction = app(ApproveOutflowAction::class);
    $this->balanceService = app(BriBalanceService::class);
});

test('T-AMN-01: Outflow rejected when amount > running balance (Action layer)', function () {
    $entityName = 'SMA Negeri 1 Karawang';

    // Deposit Rp 1.000.000 (100.000.000 cents)
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pemasukan B2B',
    ], $this->sacUser);

    // Attempt outflow of Rp 1.500.000 (> 1.000.000)
    expect(function () use ($entityName) {
        $this->createAction->execute([
            'category' => 'B2B',
            'entity_name' => $entityName,
            'type' => 'OUTFLOW',
            'amount_cents' => 150000000,
            'purpose' => 'Penarikan melebihi saldo',
        ], $this->sacUser);
    })->toThrow(InsufficientRunningBalanceException::class);
});

test('T-AMN-01 (HTTP): Outflow rejected via HTTP when amount > running balance', function () {
    $entityName = 'SMA Negeri 1 Karawang';

    // Current balance = 0
    $response = $this->actingAs($this->sacUser)
        ->post(route('bri-funds.store'), [
            'category' => 'B2B',
            'entity_name' => $entityName,
            'type' => 'OUTFLOW',
            'amount_cents' => 50000000, // Rp 500.000
            'purpose' => 'Penarikan dana',
        ]);

    // Throws InsufficientRunningBalanceException (422) or domain exception
    expect(BriFundPosting::where('type', 'OUTFLOW')->count())->toBe(0);
});

test('T-AMN-02: Outflow accepted when amount = running balance (Exact)', function () {
    $entityName = 'SMA Negeri 2 Karawang';

    // Deposit Rp 1.000.000
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pemasukan B2B awal',
    ], $this->sacUser);

    // Exact outflow of Rp 1.000.000
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Penarikan seluruh saldo',
    ], $this->sacUser);

    expect($outflow)->toBeInstanceOf(BriFundPosting::class);
    expect($outflow->status)->toBe('PENDING_SS');
    expect($outflow->amount_cents)->toBe(100000000);
});

test('T-AMN-03: Outflow accepted when amount < running balance', function () {
    $entityName = 'SMA Negeri 3 Karawang';

    // Deposit Rp 2.000.000
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 200000000,
        'purpose' => 'Pemasukan B2B awal',
    ], $this->sacUser);

    // Partial outflow of Rp 800.000
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'OUTFLOW',
        'amount_cents' => 80000000,
        'purpose' => 'Penarikan sebagian saldo',
    ], $this->sacUser);

    expect($outflow)->toBeInstanceOf(BriFundPosting::class);
    expect($outflow->status)->toBe('PENDING_SS');
    expect($outflow->amount_cents)->toBe(80000000);
});

test('T-AMN-04: Zero-Deficit Guard is checked a SECOND time during approval', function () {
    $entityName = 'PT Gramedia Mitra';

    // Initial deposit: Rp 1.000.000
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pemasukan awal',
    ], $this->sacUser);

    // Request 1: Rp 700.000 (valid at creation time, balance = 1.000.000)
    $posting1 = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'OUTFLOW',
        'amount_cents' => 70000000,
        'purpose' => 'Penarikan 1',
    ], $this->sacUser);

    // Request 2: Rp 500.000 (also valid at creation time because balance is still 1.000.000 since request 1 is PENDING_SS)
    $posting2 = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => $entityName,
        'type' => 'OUTFLOW',
        'amount_cents' => 50000000,
        'purpose' => 'Penarikan 2',
    ], $this->sacUser);

    // Approve Request 1 -> Balance reduces to 1.000.000 - 700.000 = Rp 300.000
    $this->approveAction->execute($posting1, $this->ssUser);
    expect($this->balanceService->getEntityBalance($this->store->id, $entityName, 'B2B'))->toBe(30000000);

    // Now try to approve Request 2 (amount 500.000 > current balance 300.000)
    // MUST BE REJECTED at approval time!
    expect(function () use ($posting2) {
        $this->approveAction->execute($posting2, $this->ssUser);
    })->toThrow(InsufficientRunningBalanceException::class);

    // Status of posting 2 remains PENDING_SS
    expect($posting2->fresh()->status)->toBe('PENDING_SS');
});

test('T-BRI-03: PENDING_SS outflow does NOT affect running balance until approved', function () {
    $entityName = 'Vendor Sound System';

    // Deposit Rp 1.000.000
    $this->createAction->execute([
        'category' => 'EVENT',
        'entity_name' => $entityName,
        'type' => 'INFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pemasukan dana event',
    ], $this->sacUser);

    // Create Outflow Rp 400.000 -> status is PENDING_SS
    $outflow = $this->createAction->execute([
        'category' => 'EVENT',
        'entity_name' => $entityName,
        'type' => 'OUTFLOW',
        'amount_cents' => 40000000,
        'purpose' => 'Uang muka sewa panggung',
    ], $this->sacUser);

    expect($outflow->status)->toBe('PENDING_SS');

    // Balance must STILL be Rp 1.000.000 (NOT 600.000)
    $balanceBeforeApproval = $this->balanceService->getEntityBalance($this->store->id, $entityName, 'EVENT');
    expect($balanceBeforeApproval)->toBe(100000000);

    // Now approve the outflow
    $this->approveAction->execute($outflow, $this->ssUser);

    // Balance now decreases to Rp 600.000
    $balanceAfterApproval = $this->balanceService->getEntityBalance($this->store->id, $entityName, 'EVENT');
    expect($balanceAfterApproval)->toBe(60000000);
});
