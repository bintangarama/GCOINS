<?php

use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->storeA = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->storeB = Store::create([
        'code' => '10436',
        'name' => 'Gramedia Mall Kelapa Gading',
        'is_active' => true,
    ]);

    $this->sacUserA = User::create([
        'store_id' => $this->storeA->id,
        'nik' => 'SAC001',
        'name' => 'SAC Karawang',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUserA->syncRoles(['SAC']);

    $this->adminUser = User::create([
        'store_id' => null,
        'nik' => 'ADMIN001',
        'name' => 'Global Admin',
        'role' => 'SYSTEM_ADMIN',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->adminUser->syncRoles(['SYSTEM_ADMIN']);

    // Create configs for both stores
    StoreOpnameConfig::create([
        'store_id' => $this->storeA->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000,
    ]);

    StoreOpnameConfig::create([
        'store_id' => $this->storeB->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 300000000,
    ]);
});

test('store user only sees records belonging to their store', function () {
    $this->actingAs($this->sacUserA);

    $configs = StoreOpnameConfig::all();

    expect($configs)->toHaveCount(1)
        ->and($configs->first()->store_id)->toBe($this->storeA->id)
        ->and($configs->first()->imprest_fund_cents)->toBe(500000000);
});

test('system admin can see records across all stores', function () {
    $this->actingAs($this->adminUser);

    $configs = StoreOpnameConfig::all();

    expect($configs)->toHaveCount(2);
});

test('unauthenticated query does not apply store scope automatically', function () {
    $configs = StoreOpnameConfig::all();

    expect($configs)->toHaveCount(2);
});
