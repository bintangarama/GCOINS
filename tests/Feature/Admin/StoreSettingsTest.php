<?php

use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'address' => 'Jl. Galuh Mas Raya',
        'is_active' => true,
    ]);

    $this->kasKecilConfig = StoreOpnameConfig::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000, // Rp 5.000.000
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    $this->sm = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sm->syncRoles(['SM']);

    $this->ss = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Store Supervisor',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ss->syncRoles(['SS']);

    $this->admin = User::create([
        'store_id' => null,
        'nik' => 'ADMIN001',
        'name' => 'System Admin',
        'role' => 'SYSTEM_ADMIN',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->admin->syncRoles(['SYSTEM_ADMIN']);
});

test('SM can view store settings page', function () {
    $response = $this->actingAs($this->sm)->get('/admin/store-settings');

    $response->assertStatus(200);
});

test('non-SM and non-admin cannot view store settings', function () {
    $response = $this->actingAs($this->ss)->get('/admin/store-settings');

    $response->assertStatus(403);
});

test('SM can update store settings and plafon kas kecil', function () {
    $response = $this->actingAs($this->sm)->put('/admin/store-settings', [
        'store_id' => $this->store->id,
        'name' => 'Gramedia World Karawang Updated',
        'address' => 'Jl. Galuh Mas Raya No. 12',
        'imprest_fund_cents' => 750000000, // Rp 7.500.000
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $freshStore = $this->store->fresh();
    expect($freshStore->name)->toBe('Gramedia World Karawang Updated');
    expect($freshStore->address)->toBe('Jl. Galuh Mas Raya No. 12');

    $freshConfig = $this->kasKecilConfig->fresh();
    expect($freshConfig->imprest_fund_cents)->toBe(750000000);

    $this->assertDatabaseHas('audit_logs', [
        'store_id' => $this->store->id,
        'entity_name' => 'Store',
        'entity_id' => $this->store->id,
        'action' => 'UPDATE_STORE_SETTINGS',
        'performed_by_id' => $this->sm->id,
    ]);
});

test('SYSTEM_ADMIN can update any store settings', function () {
    $response = $this->actingAs($this->admin)->put('/admin/store-settings', [
        'store_id' => $this->store->id,
        'name' => 'Gramedia World Karawang Admin Mod',
        'address' => 'Pusat Karawang',
        'imprest_fund_cents' => 1000000000, // Rp 10.000.000
    ]);

    $response->assertRedirect();

    expect($this->store->fresh()->name)->toBe('Gramedia World Karawang Admin Mod');
    expect($this->kasKecilConfig->fresh()->imprest_fund_cents)->toBe(1000000000);
});
