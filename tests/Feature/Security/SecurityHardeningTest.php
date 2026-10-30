<?php

use App\Actions\Opname\OpenSessionAction;
use App\Models\OpnameItemDefinition;
use App\Models\OpnameReferenceLine;
use App\Models\PettyCashSettlement;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\PettyCashCategorySeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->seed(PettyCashCategorySeeder::class);
    Storage::fake('public');

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->otherStore = Store::create([
        'code' => '10010',
        'name' => 'Gramedia Matraman',
        'is_active' => true,
    ]);

    StoreOpnameConfig::withoutGlobalScopes()->create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000,
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    OpnameItemDefinition::withoutGlobalScopes()->create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
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

    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Store Supervisor',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Staff',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Staff',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->otherStoreUser = User::create([
        'store_id' => $this->otherStore->id,
        'nik' => 'SOA999',
        'name' => 'Other Store SOA',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->otherStoreUser->syncRoles(['SOA']);
});

test('SAC cannot escalate privilege via tampered import-export commit payload', function (string $forbiddenRole) {
    $response = $this->actingAs($this->sacUser)->post('/admin/import-export/commit', [
        'type' => 'users',
        'valid_rows' => [
            [
                'nik' => 'HACK001',
                'name' => 'Tampered Admin',
                'role' => $forbiddenRole,
                'phone_number' => '08123456789',
                'pin' => '123456',
            ],
        ],
    ]);

    $response->assertSessionHasErrors('valid_rows.0.role');
    $this->assertDatabaseMissing('users', ['nik' => 'HACK001']);
})->with(['SYSTEM_ADMIN', 'SM', 'SS']);

test('SAC cannot import tampered vouchers for other store user or negative amount', function () {
    // Attempt cross-store user_id injection
    $responseCrossStore = $this->actingAs($this->sacUser)->post('/admin/import-export/commit', [
        'type' => 'vouchers',
        'valid_rows' => [
            [
                'user_id' => $this->otherStoreUser->id,
                'amount_cents' => 5000000,
                'purpose' => 'Cross store injection',
                'category' => 'BDL',
                'date' => '2026-10-01',
                'status' => 'SETTLED',
            ],
        ],
    ]);
    $responseCrossStore->assertSessionHasErrors('valid_rows.0.user_id');

    // Attempt negative amount injection
    $responseNegative = $this->actingAs($this->sacUser)->post('/admin/import-export/commit', [
        'type' => 'vouchers',
        'valid_rows' => [
            [
                'user_id' => $this->soaUser->id,
                'amount_cents' => -5000000,
                'purpose' => 'Negative voucher',
                'category' => 'BDL',
                'date' => '2026-10-01',
                'status' => 'SETTLED',
            ],
        ],
    ]);
    $responseNegative->assertSessionHasErrors('valid_rows.0.amount_cents');
});

test('SAC cannot import global category via tampered commit payload', function () {
    $response = $this->actingAs($this->sacUser)->post('/admin/import-export/commit', [
        'type' => 'categories',
        'valid_rows' => [
            [
                'code' => 'TAMPERED_GLOBAL',
                'name' => 'Tampered Global Category',
                'scope' => 'GLOBAL',
            ],
        ],
    ]);

    $response->assertSessionHasErrors('valid_rows.0.scope');
    $this->assertDatabaseMissing('petty_cash_categories', ['code' => 'TAMPERED_GLOBAL']);
});

test('voucher upload rejects disallowed file types and raw string paths', function () {
    $this->actingAs($this->soaUser);

    $htmlFile = UploadedFile::fake()->create('xss.html', 10, 'text/html');
    $responseHtml = $this->post('/vouchers', [
        'amount_cents' => 5000000,
        'purpose' => 'Test upload HTML',
        'category' => 'OPERASIONAL',
        'receipt_image' => $htmlFile,
        'is_submit' => true,
    ]);
    $responseHtml->assertSessionHasErrors('receipt_image');

    $responseString = $this->post('/vouchers', [
        'amount_cents' => 5000000,
        'purpose' => 'Test fake string path',
        'category' => 'OPERASIONAL',
        'receipt_image' => '/storage/vouchers/fake.webp',
        'is_submit' => true,
    ]);
    $responseString->assertSessionHasErrors('receipt_image');
});

test('voucher upload accepts valid PDF files for receipt_image and item_photo', function () {
    $this->actingAs($this->soaUser);

    $receiptPdf = UploadedFile::fake()->create('kuitansi-resmi.pdf', 500, 'application/pdf');
    $itemPdf = UploadedFile::fake()->create('lampiran-po.pdf', 400, 'application/pdf');

    $response = $this->post('/vouchers', [
        'amount_cents' => 15000000,
        'purpose' => 'Pembelian perlengkapan kantor dengan faktur PDF',
        'category' => 'OPERASIONAL',
        'receipt_image' => $receiptPdf,
        'item_photo' => $itemPdf,
        'is_submit' => true,
    ]);

    $response->assertSessionHasNoErrors();

    $voucher = PettyCashVoucher::where('purpose', 'Pembelian perlengkapan kantor dengan faktur PDF')->first();
    expect($voucher)->not->toBeNull()
        ->and($voucher->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($voucher->receipt_image_url)->toEndWith('.pdf')
        ->and($voucher->item_photo_url)->toEndWith('.pdf');
});

test('non-SAC roles cannot add or delete opname reference lines', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    $line = OpnameReferenceLine::create([
        'session_id' => $session->id,
        'line_type' => 'Z_REPORT',
        'reference_number' => 'ZR-001',
        'amount_cents' => 10000000,
    ]);

    // SOA attempt
    $this->actingAs($this->soaUser)
        ->post("/opname/{$session->id}/reference-lines", [
            'line_type' => 'Z_REPORT',
            'reference_number' => 'ZR-002',
            'amount_cents' => 20000000,
        ])
        ->assertForbidden();

    $this->actingAs($this->soaUser)
        ->delete("/opname/{$session->id}/reference-lines/{$line->id}")
        ->assertForbidden();

    // SS attempt
    $this->actingAs($this->ssUser)
        ->post("/opname/{$session->id}/reference-lines", [
            'line_type' => 'Z_REPORT',
            'reference_number' => 'ZR-003',
            'amount_cents' => 20000000,
        ])
        ->assertForbidden();

    expect(OpnameReferenceLine::where('session_id', $session->id)->count())->toBe(1);
});

test('SOA cannot access restricted admin, approval, or settlement endpoints', function () {
    $settlement = PettyCashSettlement::create([
        'store_id' => $this->store->id,
        'settlement_number' => '001/KKCL/10435/X/2026',
        'total_amount_cents' => 10000000,
        'status' => 'SETTLED',
        'settled_by_id' => $this->sacUser->id,
    ]);

    $this->actingAs($this->soaUser)->get('/admin/categories')->assertForbidden();
    $this->actingAs($this->soaUser)->get('/admin/import-export/template/users')->assertForbidden();
    $this->actingAs($this->soaUser)->get('/vouchers/pending')->assertForbidden();
    $this->actingAs($this->soaUser)->get('/vouchers/settlements')->assertForbidden();
    $this->actingAs($this->soaUser)->get("/vouchers/settlements/{$settlement->id}")->assertForbidden();
    $this->actingAs($this->soaUser)->get("/vouchers/settlements/{$settlement->id}/export-excel")->assertForbidden();
});

test('deactivated user session is immediately terminated on next request and sessions table is purged', function () {
    // Seed an active DB session record for SOA
    DB::table('sessions')->insert([
        'id' => 'test-soa-session-id',
        'user_id' => $this->soaUser->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest',
        'payload' => 'test',
        'last_activity' => time(),
    ]);

    // SM deactivates SOA
    $this->actingAs($this->smUser)
        ->post("/admin/users/{$this->soaUser->id}/toggle-status")
        ->assertRedirect('/admin/users');

    // DB session for SOA is purged
    $this->assertDatabaseMissing('sessions', ['user_id' => $this->soaUser->id]);

    // If SOA makes a request with an existing in-memory auth session, EnsureStoreScope forces logout
    $this->soaUser->refresh();
    $response = $this->actingAs($this->soaUser)->get('/dashboard');

    $response->assertRedirect(route('login'));
    $this->assertGuest();
});
