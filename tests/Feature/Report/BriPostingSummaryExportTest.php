<?php

use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->otherStore = Store::create([
        'code' => '10436',
        'name' => 'Gramedia Matraman',
        'is_active' => true,
    ]);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Kasir',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Requester',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);
});

test('BRI posting export generates multi-sheet Excel with history and running balance', function () {
    // 1. INFLOW B2B
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => 'SMK Taruna Karya',
        'type' => 'INFLOW',
        'amount_cents' => 500000000, // 5.000.000
        'purpose' => 'Pembayaran pesanan buku',
        'status' => 'APPROVED',
        'created_by_id' => $this->sacUser->id,
    ]);

    // 2. OUTFLOW B2B
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => 'SMK Taruna Karya',
        'type' => 'OUTFLOW',
        'amount_cents' => 200000000, // 2.000.000
        'purpose' => 'Pengembalian kelebihan transfer',
        'status' => 'APPROVED',
        'created_by_id' => $this->sacUser->id,
        'approved_by_id' => $this->smUser->id,
    ]);

    $response = $this->actingAs($this->sacUser)->get('/bri-funds/export');
    $response->assertOk();

    $spreadsheet = IOFactory::load($response->getFile()->getPathname());
    expect($spreadsheet->getSheetCount())->toBe(2);

    // Sheet 1: Riwayat Posting
    $sheet1 = $spreadsheet->getSheet(0);
    expect($sheet1->getTitle())->toBe('Riwayat Posting')
        ->and($sheet1->getCell('A1')->getValue())->toContain('RIWAYAT POSTING REKENING BRI');

    // Sheet 2: Saldo Berjalan
    $sheet2 = $spreadsheet->getSheet(1);
    expect($sheet2->getTitle())->toBe('Saldo Berjalan')
        ->and($sheet2->getCell('A1')->getValue())->toContain('RINGKASAN SALDO BERJALAN');

    // Find running balance formula in Sheet 2 (=D - E)
    $formulaFound = false;
    for ($r = 7; $r <= 20; $r++) {
        $cellF = $sheet2->getCell("F{$r}");
        if ($cellF->isFormula() && str_contains((string) $cellF->getValue(), '-')) {
            $formulaFound = true;
            // 5.000.000 - 2.000.000 = 3.000.000
            expect((float) $cellF->getCalculatedValue())->toBe(3000000.0);
            break;
        }
    }

    expect($formulaFound)->toBeTrue();

    @unlink($tempFile);
});

test('BRI posting export respects RBAC', function () {
    // SOA cannot export
    $this->actingAs($this->soaUser)
        ->get('/bri-funds/export')
        ->assertForbidden();

    // SAC can export
    $this->actingAs($this->sacUser)
        ->get('/bri-funds/export')
        ->assertOk();
});
