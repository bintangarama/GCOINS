<?php

use App\Models\PettyCashVoucher;
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

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Staff',
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

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);
});

test('SAC can disburse cash for an APPROVED_SS voucher', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Beli materai',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
        'approved_by_id' => $this->ssUser->id,
        'approved_at' => now(),
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->post("/vouchers/{$voucher->id}/disburse");

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_DISBURSED)
        ->and($voucher->disbursed_by_id)->toBe($this->sacUser->id)
        ->and($voucher->disbursed_at)->not->toBeNull();

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'DISBURSE_VOUCHER',
    ]);
});

test('T-RBAC-02: SOA cannot disburse cash', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Beli materai',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
        'approved_by_id' => $this->ssUser->id,
        'approved_at' => now(),
    ]);

    $this->actingAs($this->soaUser);
    $response = $this->post("/vouchers/{$voucher->id}/disburse");

    $response->assertStatus(403);
    expect($voucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_APPROVED_SS);
});

test('SAC can batch settle multiple disbursed vouchers', function () {
    $v1 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'V1',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    $v2 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '004/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 7500000,
        'purpose' => 'V2',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->post('/vouchers/batch-settle', [
        'voucher_ids' => [$v1->id, $v2->id],
    ]);

    $response->assertRedirect('/vouchers/settlement');

    expect($v1->fresh()->status)->toBe(PettyCashVoucher::STATUS_SETTLED)
        ->and($v1->fresh()->settled_at)->not->toBeNull()
        ->and($v2->fresh()->status)->toBe(PettyCashVoucher::STATUS_SETTLED)
        ->and($v2->fresh()->settled_at)->not->toBeNull();
});
