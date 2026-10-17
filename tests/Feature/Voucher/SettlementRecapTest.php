<?php

use App\Models\PettyCashSettlement;
use App\Models\PettyCashVoucher;
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

    $this->store = Store::create([
        'code' => 'GAM435',
        'name' => 'Gramedia World Karawang',
        'address' => 'Jl. Galuh Mas Raya Blok V',
        'is_active' => true,
    ]);

    $this->sacUser = User::create([
        'name' => 'Aulia Nur Endayani',
        'nik' => '101003',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store->id,
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->smUser = User::create([
        'name' => 'Eny Susanti',
        'nik' => '004838',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store->id,
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    $this->soaUser = User::create([
        'name' => 'Andra',
        'nik' => '101024',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store->id,
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);
});

test('SAC batch settle creates a PettyCashSettlement with correct KKCL number format and binds vouchers', function () {
    $v1 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/GAM435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 36600000, // Rp 366.000
        'purpose' => 'Biaya Dinas Luar Telagasari',
        'category' => 'BDL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    $v2 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/GAM435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 203485000, // Rp 2.034.850
        'purpose' => 'Konsumsi Meeting & RT Toko',
        'category' => 'KEP_RT',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->post('/vouchers/batch-settle', [
        'voucher_ids' => [$v1->id, $v2->id],
        'notes' => 'Klaim kas kecil periode awal Oktober 2026',
    ]);

    $response->assertRedirect('/vouchers/settlement');
    $response->assertSessionHas('settlement_id');

    $settlement = PettyCashSettlement::first();
    expect($settlement)->not->toBeNull()
        ->and($settlement->settlement_number)->toContain('/KKCL/GAM435/')
        ->and($settlement->total_amount_cents)->toBe(240085000)
        ->and($settlement->status)->toBe('SETTLED')
        ->and($settlement->settled_by_id)->toBe($this->sacUser->id)
        ->and($settlement->vouchers()->count())->toBe(2);

    expect($v1->fresh()->settlement_id)->toBe($settlement->id)
        ->and($v1->fresh()->status)->toBe(PettyCashVoucher::STATUS_SETTLED)
        ->and($v2->fresh()->settlement_id)->toBe($settlement->id)
        ->and($v2->fresh()->status)->toBe(PettyCashVoucher::STATUS_SETTLED);
});

test('settlement detail page loads with matrix columnar categories and store manager', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '026/KKCL/GAM435/X/2026',
        'total_amount_cents' => 240085000,
        'status' => 'SETTLED',
        'settled_by_id' => $this->sacUser->id,
    ]);

    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'settlement_id' => $settlement->id,
        'voucher_number' => '001/KKCL/GAM435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 36600000,
        'purpose' => 'Biaya Dinas Luar',
        'category' => 'BDL',
        'status' => PettyCashVoucher::STATUS_SETTLED,
        'settled_at' => now(),
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->get("/vouchers/settlements/{$settlement->id}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Voucher/SettlementDetail')
        ->has('settlement')
        ->has('categories')
        ->where('storeManager.name', 'Eny Susanti')
    );
});

test('settlement matrix excel export generates valid spreadsheet response', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '026/KKCL/GAM435/X/2026',
        'total_amount_cents' => 240085000,
        'status' => 'SETTLED',
        'settled_by_id' => $this->sacUser->id,
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->get("/vouchers/settlements/{$settlement->id}/export-excel");

    $response->assertStatus(200);
    expect($response->headers->get('content-disposition'))->toContain('Rekap-Kas-Kecil');
});
