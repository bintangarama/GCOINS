<?php

use App\Models\PettyCashVoucher;
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

test('Voucher recap export generates valid Excel spreadsheet with =SUM formula', function () {
    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/PCV/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 15000000, // 150.000
        'purpose' => 'Beli kertas kasir',
        'category' => 'STRUK_KASIR',
        'status' => 'DISBURSED',
        'disbursed_at' => now(),
    ]);

    PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/PCV/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 25000000, // 250.000
        'purpose' => 'Konsumsi lembur',
        'category' => 'KONSUMSI',
        'status' => 'SETTLED',
        'disbursed_at' => now()->subDay(),
        'settled_at' => now(),
    ]);

    // Another store's voucher (must not appear)
    PettyCashVoucher::create([
        'store_id' => $this->otherStore->id,
        'voucher_number' => '001/PCV/10436/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 99000000,
        'purpose' => 'Other Store Item',
        'category' => 'LOGISTIK',
        'status' => 'DISBURSED',
    ]);

    $response = $this->actingAs($this->sacUser)->get('/vouchers/export');
    $response->assertOk();

    $spreadsheet = IOFactory::load($response->getFile()->getPathname());
    $sheet = $spreadsheet->getActiveSheet();

    expect($sheet->getTitle())->toBe('Rekap Voucher')
        ->and($sheet->getCell('A1')->getValue())->toContain('REKAPITULASI VOUCHER');

    // Find =SUM formula in column H
    $sumCell = null;
    $vouchersCount = 0;

    for ($r = 7; $r <= 20; $r++) {
        $cellVal = $sheet->getCell("B{$r}")->getValue();
        if ($cellVal === '001/PCV/10435/IX/2026' || $cellVal === '002/PCV/10435/IX/2026') {
            $vouchersCount++;
        }

        $cellH = $sheet->getCell("H{$r}");
        if ($cellH->isFormula() && str_contains((string) $cellH->getValue(), 'SUM')) {
            $sumCell = $cellH;
            break;
        }
    }

    expect($vouchersCount)->toBe(2);
    expect($sumCell)->not->toBeNull();
    // Sum should be 150.000 + 250.000 = 400.000
    expect((float) $sumCell->getCalculatedValue())->toBe(400000.0);
});

test('Voucher recap export respects RBAC', function () {
    // SOA cannot export
    $this->actingAs($this->soaUser)
        ->get('/vouchers/export')
        ->assertForbidden();

    // SM can export
    $this->actingAs($this->smUser)
        ->get('/vouchers/export')
        ->assertOk();
});
