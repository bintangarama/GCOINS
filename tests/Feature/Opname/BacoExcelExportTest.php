<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\UpdateDenominationsAction;
use App\Actions\Opname\VerifySessionAction;
use App\Models\OpnameItemDefinition;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

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

    StoreOpnameConfig::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000,
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    $this->def100k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $this->def50k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 5000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 50.000',
        'unit' => 'Lembar',
        'sort_order' => 2,
        'is_active' => true,
    ]);

    $this->def1kCoin = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 100000,
        'group_label' => 'Uang Logam',
        'label' => 'Rp 1.000 (Koin)',
        'unit' => 'Keping',
        'sort_order' => 3,
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

    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Supervisor Saksi',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'Store Officer Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->otherStoreUser = User::create([
        'store_id' => $this->otherStore->id,
        'nik' => 'SM999',
        'name' => 'Other Store SM',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->otherStoreUser->syncRoles(['SM']);
});

test('T-XLS-01: Excel export generates valid .xlsx file with proper page setup and sign-offs', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    app(UpdateDenominationsAction::class)->execute($session, [
        ['item_definition_id' => $this->def100k->id, 'count' => 10],
        ['item_definition_id' => $this->def50k->id, 'count' => 5],
        ['item_definition_id' => $this->def1kCoin->id, 'count' => 20],
    ], $this->sacUser);

    app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    app(VerifySessionAction::class)->execute($session, $this->ssUser);
    app(SignOffSessionAction::class)->execute($session, [
        'confirm_understanding' => true,
        'notes' => 'Pemeriksaan fisik brankas sesuai.',
    ], $this->smUser);

    $response = $this->actingAs($this->sacUser)->get("/opname/{$session->id}/export-excel");

    $response->assertOk();
    $disposition = $response->headers->get('content-disposition');
    expect($disposition)->toContain('attachment')
        ->and($disposition)->toContain('.xlsx');

    $spreadsheet = IOFactory::load($response->getFile()->getPathname());
    $sheet = $spreadsheet->getActiveSheet();

    expect($sheet->getTitle())->toBe('BACO');

    // Page Setup verification (A4 portrait, fit-to-page, narrow margins)
    $pageSetup = $sheet->getPageSetup();
    expect($pageSetup->getOrientation())->toBe(PageSetup::ORIENTATION_PORTRAIT)
        ->and($pageSetup->getPaperSize())->toBe(PageSetup::PAPERSIZE_A4)
        ->and($pageSetup->getFitToPage())->toBe(true)
        ->and($pageSetup->getFitToWidth())->toBe(1)
        ->and($pageSetup->getFitToHeight())->toBe(0);

    $margins = $sheet->getPageMargins();
    expect($margins->getTop())->toBe(0.25)
        ->and($margins->getBottom())->toBe(0.25)
        ->and($margins->getLeft())->toBe(0.25)
        ->and($margins->getRight())->toBe(0.25);

    // Document header check
    expect($sheet->getCell('A1')->getValue())->toContain('BERITA ACARA CASH OPNAME')
        ->and($sheet->getCell('B4')->getValue())->toBe($session->opname_number);

    // Sign-off verification (SAC, SS, SM names and NIKs present in spreadsheet)
    $allText = '';
    foreach ($sheet->getRowIterator() as $row) {
        foreach ($row->getCellIterator() as $cell) {
            $allText .= ' '.$cell->getValue();
        }
    }

    expect($allText)->toContain('SAC Kasir')
        ->and($allText)->toContain('SAC001')
        ->and($allText)->toContain('Supervisor Saksi')
        ->and($allText)->toContain('SS001')
        ->and($allText)->toContain('Store Manager')
        ->and($allText)->toContain('SM001');
});

test('T-XLS-02: Excel contains correct native formula cells (=C*D, =SUM, etc.)', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    // 10 x 100.000 = 1.000.000
    // 5 x 50.000 = 250.000
    // 20 x 1.000 = 20.000
    // Total K_fisik = 1.270.000
    app(UpdateDenominationsAction::class)->execute($session, [
        ['item_definition_id' => $this->def100k->id, 'count' => 10],
        ['item_definition_id' => $this->def50k->id, 'count' => 5],
        ['item_definition_id' => $this->def1kCoin->id, 'count' => 20],
    ], $this->sacUser);

    $response = $this->actingAs($this->smUser)->get("/opname/{$session->id}/export-excel");
    $response->assertOk();

    $spreadsheet = IOFactory::load($response->getFile()->getPathname());
    $sheet = $spreadsheet->getActiveSheet();

    // Verify native formulas exist in column E
    $formulasFound = [];
    $sumFormulasFound = [];
    $multiplicationFormulasFound = [];

    for ($row = 8; $row <= 50; $row++) {
        $cellE = $sheet->getCell("E{$row}");
        if ($cellE->isFormula()) {
            $val = (string) $cellE->getValue();
            $formulasFound[] = $val;
            if (str_contains($val, '*')) {
                $multiplicationFormulasFound[] = $val;
            }
            if (str_contains($val, 'SUM')) {
                $sumFormulasFound[] = $val;
            }
        }
    }

    // Must have at least 3 multiplication formulas (=C*D) for our 3 items
    expect(count($multiplicationFormulasFound))->toBeGreaterThanOrEqual(3);
    expect($multiplicationFormulasFound[0])->toMatch('/=C\d+\*D\d+/');

    // Must have SUM formulas for paper subtotal, coin subtotal, vouchers, allocations, etc.
    expect(count($sumFormulasFound))->toBeGreaterThanOrEqual(2);
    expect($sumFormulasFound[0])->toContain('SUM');

    // Verify calculated value matches mathematics
    // 10 * 100000 = 1000000 Rupiah
    $firstMultCell = null;
    for ($row = 8; $row <= 30; $row++) {
        $cellE = $sheet->getCell("E{$row}");
        if ($cellE->isFormula() && str_contains((string) $cellE->getValue(), '*')) {
            $firstMultCell = $cellE;
            break;
        }
    }

    expect($firstMultCell)->not->toBeNull();
    expect((float) $firstMultCell->getCalculatedValue())->toBe(1000000.0);
});

test('Excel export respects RBAC and store isolation', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    // SOA cannot export BACO (403)
    $this->actingAs($this->soaUser)
        ->get("/opname/{$session->id}/export-excel")
        ->assertForbidden();

    // User from other store cannot access session (404 due to HasStoreScope)
    $this->actingAs($this->otherStoreUser)
        ->get("/opname/{$session->id}/export-excel")
        ->assertNotFound();

    // SS and SM from same store can export
    $this->actingAs($this->ssUser)
        ->get("/opname/{$session->id}/export-excel")
        ->assertOk();

    $this->actingAs($this->smUser)
        ->get("/opname/{$session->id}/export-excel")
        ->assertOk();
});

test('GET /opname/{session}/report renders print-friendly view with expected props', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    $response = $this->actingAs($this->sacUser)->get("/opname/{$session->id}/report");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Opname/Report')
            ->has('session')
            ->has('disbursedVouchers')
            ->has('permissions.canExportExcel')
            ->has('permissions.canUploadSignedBa')
        );
});
