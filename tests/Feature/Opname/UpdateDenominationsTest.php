<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\UpdateDenominationsAction;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
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
        'imprest_fund_cents' => 500000000,
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    // 3 definitions for testing
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

    $this->def50k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 5000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 50.000',
        'unit' => 'Lembar',
        'sort_order' => 2,
        'is_active' => true,
    ]);

    $this->def1k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 100000,
        'group_label' => 'Uang Logam',
        'label' => 'Rp 1.000',
        'unit' => 'Keping',
        'sort_order' => 3,
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

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA User',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->session = app(OpenSessionAction::class)->execute($this->sacUser);
});

test('UpdateDenominationsAction: updates count and calculates subtotal correctly', function () {
    $action = app(UpdateDenominationsAction::class);

    $items = [
        ['item_definition_id' => $this->def100k->id, 'count' => 10], // 10 x 100.000 = 1.000.000 (100.000.000 cents)
        ['item_definition_id' => $this->def50k->id, 'count' => 4],   // 4 x 50.000 = 200.000 (20.000.000 cents)
    ];

    $updatedSession = $action->execute($this->session, $items, $this->sacUser);

    expect($updatedSession->physical_total_cents)->toBe(120000000); // Rp 1.200.000

    $count100k = OpnameItemCount::where('session_id', $this->session->id)
        ->where('item_definition_id', $this->def100k->id)
        ->first();

    expect($count100k->count)->toBe(10)
        ->and($count100k->subtotal_cents)->toBe(100000000);
});

test('T-DEN-03: Auto-heal: missing items created with count 0', function () {
    // Delete one item count record
    OpnameItemCount::where('session_id', $this->session->id)
        ->where('item_definition_id', $this->def1k->id)
        ->delete();

    expect(OpnameItemCount::where('session_id', $this->session->id)->count())->toBe(2);

    $action = app(UpdateDenominationsAction::class);
    // Send update only for def100k
    $items = [
        ['item_definition_id' => $this->def100k->id, 'count' => 5],
    ];

    $action->execute($this->session, $items, $this->sacUser);

    // def1k must be auto-healed and restored with count 0
    $healed = OpnameItemCount::where('session_id', $this->session->id)
        ->where('item_definition_id', $this->def1k->id)
        ->first();

    expect($healed)->not->toBeNull()
        ->and($healed->count)->toBe(0)
        ->and($healed->subtotal_cents)->toBe(0)
        ->and(OpnameItemCount::where('session_id', $this->session->id)->count())->toBe(3);
});

test('UpdateDenominationsAction: throws exception if user is not SAC', function () {
    $action = app(UpdateDenominationsAction::class);

    $items = [
        ['item_definition_id' => $this->def100k->id, 'count' => 5],
    ];

    expect(fn () => $action->execute($this->session, $items, $this->soaUser))
        ->toThrow(AuthorizationException::class);
});

test('PUT /opname/{session}/denominations: endpoint updates counts via HTTP', function () {
    $items = [
        ['item_definition_id' => $this->def100k->id, 'count' => 15], // 15 x 100k = 1.500.000
    ];

    $response = $this->actingAs($this->sacUser)
        ->put("/opname/{$this->session->id}/denominations", [
            'items' => $items,
        ]);

    $response->assertRedirect();
    expect($this->session->fresh()->physical_total_cents)->toBe(150000000);
});
