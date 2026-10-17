<?php

use App\Models\PettyCashCategory;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PettyCashCategorySeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->seed(PettyCashCategorySeeder::class);

    $this->store1 = Store::create([
        'code' => 'GAM435',
        'name' => 'Gramedia World Karawang',
        'address' => 'Jl. Galuh Mas Raya',
        'is_active' => true,
    ]);

    $this->store2 = Store::create([
        'code' => 'GAM010',
        'name' => 'Gramedia Matraman',
        'address' => 'Jl. Matraman Raya',
        'is_active' => true,
    ]);

    $this->adminUser = User::create([
        'name' => 'System Admin',
        'nik' => 'ADMIN001',
        'role' => 'SYSTEM_ADMIN',
        'pin_hash' => Hash::make('123456'),
        'store_id' => null,
        'is_active' => true,
    ]);
    $this->adminUser->syncRoles(['SYSTEM_ADMIN']);

    $this->sacUser1 = User::create([
        'name' => 'Aulia SAC',
        'nik' => 'SAC435',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store1->id,
        'is_active' => true,
    ]);
    $this->sacUser1->syncRoles(['SAC']);

    $this->sacUser2 = User::create([
        'name' => 'Budi SAC',
        'nik' => 'SAC010',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store2->id,
        'is_active' => true,
    ]);
    $this->sacUser2->syncRoles(['SAC']);
});

test('global categories are seeded and visible across all stores', function () {
    $globalCount = PettyCashCategory::global()->count();
    expect($globalCount)->toBe(10);

    // Visible for store1
    $store1Categories = PettyCashCategory::forStore($this->store1->id)->get();
    expect($store1Categories->count())->toBe(10);

    // Visible for store2
    $store2Categories = PettyCashCategory::forStore($this->store2->id)->get();
    expect($store2Categories->count())->toBe(10);
});

test('SYSTEM_ADMIN can create global category', function () {
    $this->actingAs($this->adminUser);

    $response = $this->post('/admin/categories', [
        'code' => 'PROMOSI_EVENT',
        'name' => 'Promosi & Event Spesial',
        'description' => 'Biaya event promosi tahunan',
        'sort_order' => 110,
        'store_id' => 'global',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $category = PettyCashCategory::where('code', 'PROMOSI_EVENT')->first();
    expect($category)->not->toBeNull()
        ->and($category->isGlobal())->toBeTrue()
        ->and($category->name)->toBe('Promosi & Event Spesial');
});

test('SM or SAC cannot create global category', function () {
    $this->actingAs($this->sacUser1);

    $response = $this->post('/admin/categories', [
        'code' => 'GLOBAL_FAIL',
        'name' => 'Should Fail Global',
        'store_id' => null,
    ]);

    // Controller forces store_id to user's store_id for non-admin
    $cat = PettyCashCategory::where('code', 'GLOBAL_FAIL')->first();
    expect($cat)->not->toBeNull()
        ->and($cat->store_id)->toBe($this->store1->id);
});

test('SAC can create category for their own store', function () {
    $this->actingAs($this->sacUser1);

    $response = $this->post('/admin/categories', [
        'code' => 'BAZAR_DONBOSCO',
        'name' => 'Biaya Bazar Don Bosco',
        'description' => 'Khusus event lokal Karawang',
        'sort_order' => 120,
    ]);

    $response->assertSessionHasNoErrors();

    $cat = PettyCashCategory::where('code', 'BAZAR_DONBOSCO')->first();
    expect($cat)->not->toBeNull()
        ->and($cat->store_id)->toBe($this->store1->id);

    // Store 1 can see it
    $store1Cats = PettyCashCategory::forStore($this->store1->id)->pluck('code')->all();
    expect($store1Cats)->toContain('BAZAR_DONBOSCO');

    // Store 2 CANNOT see Store 1's custom category
    $store2Cats = PettyCashCategory::forStore($this->store2->id)->pluck('code')->all();
    expect($store2Cats)->not->toContain('BAZAR_DONBOSCO');
});

test('authorized user can toggle category active status', function () {
    $this->actingAs($this->adminUser);

    $cat = PettyCashCategory::where('code', 'BDL')->first();
    expect($cat->is_active)->toBeTrue();

    $this->post("/admin/categories/{$cat->id}/toggle-status");
    expect($cat->fresh()->is_active)->toBeFalse();

    $this->post("/admin/categories/{$cat->id}/toggle-status");
    expect($cat->fresh()->is_active)->toBeTrue();
});
