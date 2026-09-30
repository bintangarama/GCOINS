<?php

use App\Actions\BriFund\ApproveOutflowAction;
use App\Actions\BriFund\CreatePostingAction;
use App\Exceptions\DualControlException;
use App\Models\Store;
use App\Models\User;
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

    $this->ssUser1 = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Store Supervisor 1',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser1->syncRoles(['SS']);

    $this->ssUser2 = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS002',
        'name' => 'Store Supervisor 2',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser2->syncRoles(['SS']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    $this->createAction = app(CreatePostingAction::class);
    $this->approveAction = app(ApproveOutflowAction::class);

    // Initial deposit for testing outflows
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'INFLOW',
        'amount_cents' => 500000000, // Rp 5.000.000
        'purpose' => 'Deposit awal',
    ], $this->sacUser);
});

test('T-DC-01: SAC cannot approve own BRI outflow (FORBIDDEN / DUAL_CONTROL_VIOLATION)', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000, // Rp 1.000.000
        'purpose' => 'Penarikan dana oleh SAC',
    ], $this->sacUser);

    expect(function () use ($outflow) {
        $this->approveAction->execute($outflow, $this->sacUser);
    })->toThrow(DomainException::class);
});

test('T-DC-01 (HTTP): SAC receives 403 Forbidden when attempting to approve own BRI outflow', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Penarikan dana',
    ], $this->sacUser);

    $response = $this->actingAs($this->sacUser)
        ->post(route('bri-funds.approve', $outflow));

    $response->assertForbidden();
    expect($outflow->fresh()->status)->toBe('PENDING_SS');
});

test('T-DC-02: SS can approve SAC\'s BRI outflow', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Penarikan dana oleh SAC',
    ], $this->sacUser);

    $approved = $this->approveAction->execute($outflow, $this->ssUser1);

    expect($approved->status)->toBe('APPROVED');
    expect($approved->approved_by_id)->toBe($this->ssUser1->id);
    expect($approved->approved_at)->not->toBeNull();
});

test('T-DC-02 (HTTP): SS can approve SAC\'s BRI outflow via HTTP route', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Penarikan dana oleh SAC',
    ], $this->sacUser);

    $response = $this->actingAs($this->ssUser1)
        ->post(route('bri-funds.approve', $outflow));

    $response->assertRedirect();
    expect($outflow->fresh()->status)->toBe('APPROVED');
    expect($outflow->fresh()->approved_by_id)->toBe($this->ssUser1->id);
});

test('T-DC-03: SS cannot approve own BRI outflow (creator != approver invariant)', function () {
    // SS1 creates an outflow posting
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran oleh SS1',
    ], $this->ssUser1);

    // SS1 attempts to approve their own outflow -> must throw DualControlException
    expect(function () use ($outflow) {
        $this->approveAction->execute($outflow, $this->ssUser1);
    })->toThrow(DualControlException::class);

    // Another SS (SS2) CAN approve it
    $approved = $this->approveAction->execute($outflow, $this->ssUser2);
    expect($approved->status)->toBe('APPROVED');
    expect($approved->approved_by_id)->toBe($this->ssUser2->id);
});

test('T-DC-04: SM can also approve BRI outflow created by SAC or SS', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 150000000,
        'purpose' => 'Pengeluaran proyek besar',
    ], $this->sacUser);

    $approved = $this->approveAction->execute($outflow, $this->smUser);

    expect($approved->status)->toBe('APPROVED');
    expect($approved->approved_by_id)->toBe($this->smUser->id);
});
