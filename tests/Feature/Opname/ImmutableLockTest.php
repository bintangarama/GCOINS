<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\UpdateBriSubledgerAction;
use App\Actions\Opname\UpdateDenominationsAction;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
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

    StoreOpnameConfig::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000,
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    $this->def100k = OpnameItemDefinition::create([
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
        'name' => 'SAC User',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    // Create session and set it to APPROVED (locked)
    $this->session = app(OpenSessionAction::class)->execute($this->sacUser);
    $this->session->status = CashOpnameSession::STATUS_APPROVED;
    $this->session->approved_by_sm_id = $this->smUser->id;
    $this->session->approved_sm_at = now();
    $this->session->save();
});

test('T-LCK-01: APPROVED session cannot be modified', function () {
    expect($this->session->isLocked())->toBeTrue()
        ->and($this->session->isApproved())->toBeTrue();
});

test('T-LCK-02: APPROVED session items cannot be updated', function () {
    $action = app(UpdateDenominationsAction::class);

    $items = [
        ['item_definition_id' => $this->def100k->id, 'count' => 5],
    ];

    expect(fn () => $action->execute($this->session, $items, $this->sacUser))
        ->toThrow(DomainException::class, 'SESSION_LOCKED');
});

test('T-LCK-02: HTTP PUT fails with 403 on APPROVED session', function () {
    $items = [
        ['item_definition_id' => $this->def100k->id, 'count' => 5],
    ];

    $response = $this->actingAs($this->sacUser)
        ->put("/opname/{$this->session->id}/denominations", [
            'items' => $items,
        ]);

    $response->assertForbidden();
});

test('T-LCK-03: APPROVED session BRI sub-ledger cannot be updated', function () {
    $action = app(UpdateBriSubledgerAction::class);

    expect(fn () => $action->execute($this->session, ['bri_mutation_total_cents' => 50000000], $this->sacUser))
        ->toThrow(DomainException::class, 'SESSION_LOCKED');

    $response = $this->actingAs($this->sacUser)
        ->put("/opname/{$this->session->id}/bri-subledger", [
            'bri_mutation_total_cents' => 50000000,
        ]);

    $response->assertForbidden();
});
