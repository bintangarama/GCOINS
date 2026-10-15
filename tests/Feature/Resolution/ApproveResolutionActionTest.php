<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Resolution\ApproveResolutionAction;
use App\Actions\Resolution\CreateResolutionAction;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use App\Models\VarianceResolution;
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

    OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Kasir',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'SS Saksi',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

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

test('SS can approve resolution <= Rp 1.000.000', function () {
    $openAction = app(OpenSessionAction::class);
    $createAction = app(CreateResolutionAction::class);
    $approveAction = app(ApproveResolutionAction::class);

    $session = $openAction->execute($this->sacUser);
    $session->update([
        'total_actual_cents' => 490000000, // Tekor Rp 100.000
        'raw_discrepancy_cents' => -10000000,
        'outstanding_variance_cents' => -10000000,
        'variance_status' => CashOpnameSession::VARIANCE_SHORTAGE,
    ]);

    $resolution = $createAction->execute($session, [
        'kind' => 'REPLACED',
        'amount_cents' => 10000000, // Rp 100.000 <= 1.000.000
        'reason' => 'Penggantian uang kasir',
    ], $this->sacUser);

    $approved = $approveAction->execute($resolution, $this->ssUser);

    expect($approved->status)->toBe(VarianceResolution::STATUS_APPROVED)
        ->and($approved->approved_by_id)->toBe($this->ssUser->id);

    $session->refresh();
    expect($session->cumulative_resolved_cents)->toBe(10000000)
        ->and($session->outstanding_variance_cents)->toBe(0)
        ->and($session->variance_status)->toBe(CashOpnameSession::VARIANCE_BALANCED);
});

test('SS is forbidden from approving resolution > Rp 1.000.000 (SM only)', function () {
    $openAction = app(OpenSessionAction::class);
    $createAction = app(CreateResolutionAction::class);
    $approveAction = app(ApproveResolutionAction::class);

    $session = $openAction->execute($this->sacUser);

    $resolution = $createAction->execute($session, [
        'kind' => 'WRITE_OFF',
        'amount_cents' => 150000000, // Rp 1.500.000 > 1.000.000
        'reason' => 'Penghapusan selisih bencana alam',
    ], $this->sacUser);

    expect(fn () => $approveAction->execute($resolution, $this->ssUser))
        ->toThrow(AuthorizationException::class, 'Resolusi selisih di atas Rp 1.000.000 hanya boleh disetujui oleh Store Manager (SM).');
});

test('SM can approve resolution > Rp 1.000.000', function () {
    $openAction = app(OpenSessionAction::class);
    $createAction = app(CreateResolutionAction::class);
    $approveAction = app(ApproveResolutionAction::class);

    $session = $openAction->execute($this->sacUser);

    $resolution = $createAction->execute($session, [
        'kind' => 'WRITE_OFF',
        'amount_cents' => 150000000, // Rp 1.500.000
        'reason' => 'Penghapusan selisih',
    ], $this->sacUser);

    $approved = $approveAction->execute($resolution, $this->smUser);

    expect($approved->status)->toBe(VarianceResolution::STATUS_APPROVED)
        ->and($approved->approved_by_id)->toBe($this->smUser->id);
});

test('Dual control: Creator cannot approve their own resolution even if they have SS or SM role', function () {
    $openAction = app(OpenSessionAction::class);
    $createAction = app(CreateResolutionAction::class);
    $approveAction = app(ApproveResolutionAction::class);

    $session = $openAction->execute($this->sacUser);

    // SM creates a resolution
    $resolution = $createAction->execute($session, [
        'kind' => 'REPLACED',
        'amount_cents' => 5000000,
        'reason' => 'Penggantian dana',
    ], $this->smUser);

    // SM attempts to approve their own resolution -> Must fail with Dual Control
    expect(fn () => $approveAction->execute($resolution, $this->smUser))
        ->toThrow(AuthorizationException::class, 'DUAL_CONTROL: Pembuat resolusi dilarang menyetujui pengajuannya sendiri.');
});
