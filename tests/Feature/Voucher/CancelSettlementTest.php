<?php

use App\Models\AuditLog;
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

    $this->otherStore = Store::create([
        'code' => 'GAM101',
        'name' => 'Gramedia Matraman',
        'address' => 'Jl. Matraman Raya No. 46-48',
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

    $this->ssUser = User::create([
        'name' => 'Budi Santoso',
        'nik' => '101010',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store->id,
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    $this->soaUser = User::create([
        'name' => 'Andra',
        'nik' => '101024',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->store->id,
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->otherSacUser = User::create([
        'name' => 'Citra Dewi',
        'nik' => '201005',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'store_id' => $this->otherStore->id,
        'is_active' => true,
    ]);
    $this->otherSacUser->syncRoles(['SAC']);
});

test('SAC can cancel settlement recap, returning vouchers to DISBURSED and logging audit entries', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '002/KKCL/GAM435/XI/2026',
        'total_amount_cents' => 124680000,
        'status' => PettyCashSettlement::STATUS_SETTLED,
        'settled_by_id' => $this->sacUser->id,
    ]);

    $v1 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'settlement_id' => $settlement->id,
        'voucher_number' => '001/KKCL/GAM435/XI/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 50000000,
        'purpose' => 'Pembelian Alat Tulis Kantor',
        'category' => 'ATK',
        'status' => PettyCashVoucher::STATUS_SETTLED,
        'settled_at' => now(),
    ]);

    $v2 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'settlement_id' => $settlement->id,
        'voucher_number' => '002/KKCL/GAM435/XI/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 74680000,
        'purpose' => 'Konsumsi Rapat Evaluasi',
        'category' => 'KONSUMSI',
        'status' => PettyCashVoucher::STATUS_SETTLED,
        'settled_at' => now(),
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->delete("/vouchers/settlements/{$settlement->id}", [
        'reason' => 'Koreksi kesalahan input nominal kas kecil',
    ]);

    $response->assertRedirect('/vouchers/settlements');
    $response->assertSessionHas('success');

    // Settlement record is deleted
    expect(PettyCashSettlement::find($settlement->id))->toBeNull();

    // Vouchers reverted to DISBURSED with null settlement_id
    expect($v1->fresh()->status)->toBe(PettyCashVoucher::STATUS_DISBURSED)
        ->and($v1->fresh()->settlement_id)->toBeNull()
        ->and($v1->fresh()->settled_at)->toBeNull()
        ->and($v2->fresh()->status)->toBe(PettyCashVoucher::STATUS_DISBURSED)
        ->and($v2->fresh()->settlement_id)->toBeNull()
        ->and($v2->fresh()->settled_at)->toBeNull();

    // Audit logs created
    $settlementAudit = AuditLog::where('entity_name', 'PettyCashSettlement')
        ->where('action', 'CANCEL_SETTLEMENT_RECAP')
        ->first();
    expect($settlementAudit)->not->toBeNull()
        ->and($settlementAudit->performed_by_id)->toBe($this->sacUser->id)
        ->and($settlementAudit->old_values['settlement_number'])->toBe('002/KKCL/GAM435/XI/2026')
        ->and($settlementAudit->new_values['reason'])->toBe('Koreksi kesalahan input nominal kas kecil');

    $voucherAudits = AuditLog::where('entity_name', 'PettyCashVoucher')
        ->where('action', 'UNSETTLE_VOUCHER')
        ->get();
    expect($voucherAudits)->toHaveCount(2);
});

test('SM can also cancel settlement recap for their store', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '001/KKCL/GAM435/XI/2026',
        'total_amount_cents' => 74760000,
        'status' => PettyCashSettlement::STATUS_SETTLED,
        'settled_by_id' => $this->sacUser->id,
    ]);

    $v = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'settlement_id' => $settlement->id,
        'voucher_number' => '010/KKCL/GAM435/XI/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 74760000,
        'purpose' => 'Biaya Kurir Pengiriman Dokumen',
        'category' => 'EXPEDISI',
        'status' => PettyCashVoucher::STATUS_SETTLED,
        'settled_at' => now(),
    ]);

    $this->actingAs($this->smUser);
    $response = $this->delete("/vouchers/settlements/{$settlement->id}", [
        'reason' => 'Dibatalkan atas arahan Store Manager untuk revisi bon',
    ]);

    $response->assertRedirect('/vouchers/settlements');
    expect(PettyCashSettlement::find($settlement->id))->toBeNull()
        ->and($v->fresh()->status)->toBe(PettyCashVoucher::STATUS_DISBURSED)
        ->and($v->fresh()->settlement_id)->toBeNull();
});

test('unauthorized roles (SS, SOA) cannot cancel settlement recap', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '001/KKCL/GAM435/XI/2026',
        'total_amount_cents' => 50000000,
        'status' => PettyCashSettlement::STATUS_SETTLED,
        'settled_by_id' => $this->sacUser->id,
    ]);

    // Test SOA
    $this->actingAs($this->soaUser);
    $response = $this->delete("/vouchers/settlements/{$settlement->id}", [
        'reason' => 'Percobaan pembatalan oleh SOA',
    ]);
    $response->assertStatus(403);

    // Test SS
    $this->actingAs($this->ssUser);
    $response = $this->delete("/vouchers/settlements/{$settlement->id}", [
        'reason' => 'Percobaan pembatalan oleh SS',
    ]);
    $response->assertStatus(403);

    expect(PettyCashSettlement::find($settlement->id))->not->toBeNull();
});

test('user from another store cannot cancel settlement recap (Store Isolation)', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '001/KKCL/GAM435/XI/2026',
        'total_amount_cents' => 50000000,
        'status' => PettyCashSettlement::STATUS_SETTLED,
        'settled_by_id' => $this->sacUser->id,
    ]);

    $this->actingAs($this->otherSacUser);
    $response = $this->delete("/vouchers/settlements/{$settlement->id}", [
        'reason' => 'Percobaan pembatalan toko lain',
    ]);
    // HasStoreScope hides other store's settlement records, resulting in 404 Not Found
    $response->assertNotFound();

    expect(PettyCashSettlement::withoutGlobalScopes()->find($settlement->id))->not->toBeNull();
});

test('cancellation requires reason with at least 5 characters', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '001/KKCL/GAM435/XI/2026',
        'total_amount_cents' => 50000000,
        'status' => PettyCashSettlement::STATUS_SETTLED,
        'settled_by_id' => $this->sacUser->id,
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->delete("/vouchers/settlements/{$settlement->id}", [
        'reason' => 'abc', // less than 5 characters
    ]);

    $response->assertSessionHasErrors(['reason']);
    expect(PettyCashSettlement::find($settlement->id))->not->toBeNull();
});
