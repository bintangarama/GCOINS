<?php

use App\Actions\Import\ImportBriPostingsAction;
use App\Actions\Import\ImportUsersAction;
use App\Actions\Import\ImportVouchersAction;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->sac = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'Staff Admin Clerk',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sac->syncRoles(['SAC']);

    $this->sm = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sm->syncRoles(['SM']);

    $this->soa = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'Store Officer Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soa->syncRoles(['SOA']);
});

test('SAC and SM can view import export center', function () {
    $response = $this->actingAs($this->sac)->get('/admin/import-export');
    $response->assertStatus(200);

    $responseSm = $this->actingAs($this->sm)->get('/admin/import-export');
    $responseSm->assertStatus(200);
});

test('SOA cannot view import export center', function () {
    $response = $this->actingAs($this->soa)->get('/admin/import-export');
    $response->assertStatus(403);
});

test('can download excel import templates', function () {
    $responseUsers = $this->actingAs($this->sac)->get('/admin/import-export/template/users');
    $responseUsers->assertStatus(200);
    expect($responseUsers->headers->get('content-type'))->toContain('spreadsheet');

    $responseVouchers = $this->actingAs($this->sac)->get('/admin/import-export/template/vouchers');
    $responseVouchers->assertStatus(200);

    $responseBri = $this->actingAs($this->sac)->get('/admin/import-export/template/bri-postings');
    $responseBri->assertStatus(200);
});

test('can export users and audit logs', function () {
    $responseUsers = $this->actingAs($this->sac)->get('/admin/import-export/export/users');
    $responseUsers->assertStatus(200);
    expect($responseUsers->headers->get('content-type'))->toContain('spreadsheet');

    $responseAudit = $this->actingAs($this->sac)->get('/admin/import-export/export/audit-logs');
    $responseAudit->assertStatus(200);
});

test('import users action preview validates rows correctly', function () {
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([
        ['NIK', 'Nama Lengkap', 'Role', 'Nomor Telepon', 'PIN Awal'],
        ['10435010', 'Pegawai Baru', 'SOA', '08123456789', '123456'], // Valid
        ['', 'Tanpa NIK', 'SOA', '', '123456'], // Error: NIK empty
        ['10435011', 'Role Salah', 'INVALID_ROLE', '', '123456'], // Error: Role invalid
        ['10435012', 'PIN Pendek', 'SOA', '', '123'], // Error: PIN < 6
        ['SAC001', 'NIK Duplikat DB', 'SAC', '', '123456'], // Error: Already exists in DB
    ]);

    $tempFile = tempnam(sys_get_temp_dir(), 'test_users_').'.xlsx';
    (new Xlsx($spreadsheet))->save($tempFile);

    $action = app(ImportUsersAction::class);
    $result = $action->preview($tempFile, $this->store);

    expect(count($result['valid_rows']))->toBe(1);
    expect(count($result['error_rows']))->toBe(4);
    expect($result['valid_rows'][0]['nik'])->toBe('10435010');

    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
});

test('import users action commit inserts users and creates audit log', function () {
    $validRows = [
        [
            'nik' => '10435099',
            'name' => 'Budi Santoso',
            'role' => 'SOA',
            'phone_number' => '081234567890',
            'pin' => '123456',
        ],
    ];

    $action = app(ImportUsersAction::class);
    $count = $action->commit($validRows, $this->store, $this->sac);

    expect($count)->toBe(1);

    $this->assertDatabaseHas('users', [
        'store_id' => $this->store->id,
        'nik' => '10435099',
        'name' => 'Budi Santoso',
        'role' => 'SOA',
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'store_id' => $this->store->id,
        'entity_name' => 'User',
        'action' => 'IMPORT_USERS',
        'performed_by_id' => $this->sac->id,
    ]);
});

test('import vouchers action preview validates data correctly', function () {
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([
        ['NIK Pemohon', 'Nominal', 'Keperluan', 'Kategori', 'Tanggal', 'Status'],
        ['SAC001', '50000', 'Beli Materai', 'OPERASIONAL', '2026-09-01', 'SETTLED'], // Valid
        ['NONEXIST', '50000', 'Beli Kertas', 'OPERASIONAL', '2026-09-01', 'SETTLED'], // Error: user not found
        ['SAC001', '0', 'Beli Kopi', 'KONSUMSI', '2026-09-01', 'SETTLED'], // Error: amount 0
    ]);

    $tempFile = tempnam(sys_get_temp_dir(), 'test_vch_').'.xlsx';
    (new Xlsx($spreadsheet))->save($tempFile);

    $action = app(ImportVouchersAction::class);
    $result = $action->preview($tempFile, $this->store);

    expect(count($result['valid_rows']))->toBe(1);
    expect(count($result['error_rows']))->toBe(2);

    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
});

test('import bri postings action preview validates data correctly', function () {
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([
        ['Kategori', 'Nama Entitas', 'Tipe', 'Nominal', 'Keperluan', 'Tanggal'],
        ['B2B', 'PT Gramedia Asri Media', 'INFLOW', '5000000', 'Droping Kas', '2026-09-01'], // Valid
        ['INVALID_CAT', 'Mitra', 'INFLOW', '100000', 'Tes', '2026-09-01'], // Error category
        ['B2B', '', 'INFLOW', '100000', 'Tes', '2026-09-01'], // Error entity name empty
    ]);

    $tempFile = tempnam(sys_get_temp_dir(), 'test_bri_').'.xlsx';
    (new Xlsx($spreadsheet))->save($tempFile);

    $action = app(ImportBriPostingsAction::class);
    $result = $action->preview($tempFile, $this->store);

    expect(count($result['valid_rows']))->toBe(1);
    expect(count($result['error_rows']))->toBe(2);

    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
});
