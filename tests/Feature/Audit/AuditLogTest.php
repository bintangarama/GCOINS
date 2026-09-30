<?php

use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store1 = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->store2 = Store::create([
        'code' => '10436',
        'name' => 'Gramedia Grand Metropolitan Bekasi',
        'is_active' => true,
    ]);

    $this->sm = User::create([
        'store_id' => $this->store1->id,
        'nik' => 'SM001',
        'name' => 'Store Manager Karawang',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sm->syncRoles(['SM']);

    $this->sac = User::create([
        'store_id' => $this->store1->id,
        'nik' => 'SAC001',
        'name' => 'Staff Admin Clerk',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sac->syncRoles(['SAC']);

    $this->soa = User::create([
        'store_id' => $this->store1->id,
        'nik' => 'SOA001',
        'name' => 'Store Officer Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soa->syncRoles(['SOA']);

    $this->admin = User::create([
        'store_id' => null,
        'nik' => 'ADMIN001',
        'name' => 'System Admin Pusat',
        'role' => 'SYSTEM_ADMIN',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->admin->syncRoles(['SYSTEM_ADMIN']);
});

test('T-AUD-01: audit log created on voucher status change', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store1->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->soa->id,
        'amount_cents' => 15000000,
        'purpose' => 'Pembelian ATK',
        'category' => 'OPERASIONAL',
        'status' => 'DRAFT',
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->soa)->post("/vouchers/{$voucher->id}/submit");

    $this->assertDatabaseHas('audit_logs', [
        'store_id' => $this->store1->id,
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'SUBMIT_VOUCHER',
        'performed_by_id' => $this->soa->id,
    ]);
});

test('T-AUD-02: audit log captures old and new values', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store1->id,
        'voucher_number' => '002/KKCL/10435/IX/2026',
        'requester_id' => $this->soa->id,
        'amount_cents' => 10000000,
        'purpose' => 'Konsumsi Meeting',
        'category' => 'KONSUMSI',
        'status' => 'DRAFT',
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->soa)->post("/vouchers/{$voucher->id}/submit");

    $log = AuditLog::where('entity_id', $voucher->id)
        ->where('action', 'SUBMIT_VOUCHER')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->old_values)->toHaveKey('status', 'DRAFT');
    expect($log->new_values)->toHaveKey('status', 'SUBMITTED');
});

test('SAC and SM can view audit logs for their store', function () {
    AuditLog::create([
        'store_id' => $this->store1->id,
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => 'vch-1',
        'action' => 'APPROVE',
        'performed_by_id' => $this->sm->id,
        'old_values' => ['status' => 'SUBMITTED'],
        'new_values' => ['status' => 'APPROVED_SS'],
    ]);

    $response = $this->actingAs($this->sm)->get('/admin/audit-logs');
    $response->assertStatus(200);

    $responseSac = $this->actingAs($this->sac)->get('/admin/audit-logs');
    $responseSac->assertStatus(200);
});

test('SOA cannot access audit logs', function () {
    $response = $this->actingAs($this->soa)->get('/admin/audit-logs');

    $response->assertStatus(403);
});

test('SYSTEM_ADMIN can view cross-store audit logs', function () {
    AuditLog::create([
        'store_id' => $this->store1->id,
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => 'vch-store-1',
        'action' => 'APPROVE',
        'performed_by_id' => $this->sm->id,
    ]);

    AuditLog::create([
        'store_id' => $this->store2->id,
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => 'vch-store-2',
        'action' => 'APPROVE',
        'performed_by_id' => $this->sm->id,
    ]);

    $response = $this->actingAs($this->admin)->get('/admin/audit-logs');

    $response->assertStatus(200);
});

test('audit logs can be exported as Excel', function () {
    AuditLog::create([
        'store_id' => $this->store1->id,
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => 'vch-export-1',
        'action' => 'DISBURSE',
        'performed_by_id' => $this->sac->id,
    ]);

    $response = $this->actingAs($this->sm)->get('/admin/audit-logs/export');

    $response->assertStatus(200);
    expect($response->headers->get('content-type'))->toContain('spreadsheet');
});
