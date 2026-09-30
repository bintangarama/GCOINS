<?php

use App\Actions\Voucher\CreateVoucherAction;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
    Storage::fake('public');

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    StoreOpnameConfig::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000, // Rp 5.000.000
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
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

    $this->createAction = app(CreateVoucherAction::class);
});

test('SOA can create a draft voucher', function () {
    $this->actingAs($this->soaUser);

    $response = $this->post('/vouchers', [
        'amount_cents' => 7500000,
        'purpose' => 'Beli sapu dan pel toko',
        'category' => 'OPERASIONAL',
        'is_submit' => false,
    ]);

    $voucher = PettyCashVoucher::where('purpose', 'Beli sapu dan pel toko')->first();
    expect($voucher)->not->toBeNull()
        ->and($voucher->status)->toBe(PettyCashVoucher::STATUS_DRAFT)
        ->and($voucher->amount_cents)->toBe(7500000)
        ->and($voucher->requester_id)->toBe($this->soaUser->id)
        ->and($voucher->voucher_number)->toContain('/KKCL/10435/');

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'CREATE_VOUCHER',
    ]);
});

test('SOA can create and submit voucher directly with receipt photo', function () {
    $this->actingAs($this->soaUser);

    $file = UploadedFile::fake()->image('receipt.webp');

    $response = $this->post('/vouchers', [
        'amount_cents' => 12000000,
        'purpose' => 'Konsumsi lembur tim audit',
        'category' => 'KONSUMSI',
        'receipt_image' => $file,
        'is_submit' => true,
    ]);

    $voucher = PettyCashVoucher::where('purpose', 'Konsumsi lembur tim audit')->first();
    expect($voucher)->not->toBeNull()
        ->and($voucher->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($voucher->receipt_image_url)->not->toBeNull();

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'SUBMIT_VOUCHER',
    ]);

    // Check notifications dispatched to SS and SAC
    $this->assertDatabaseHas('notifications', [
        'store_id' => $this->store->id,
        'user_id' => $this->ssUser->id,
        'type' => 'VOUCHER_SUBMITTED',
        'entity_id' => $voucher->id,
    ]);
    $this->assertDatabaseHas('notifications', [
        'store_id' => $this->store->id,
        'user_id' => $this->sacUser->id,
        'type' => 'VOUCHER_SUBMITTED',
        'entity_id' => $voucher->id,
    ]);
});

test('T-RBAC-04: SM cannot create vouchers', function () {
    $this->actingAs($this->smUser);

    $response = $this->get('/vouchers/create');
    $response->assertStatus(403);

    $responsePost = $this->post('/vouchers', [
        'amount_cents' => 5000000,
        'purpose' => 'Test',
        'category' => 'OPERASIONAL',
    ]);
    $responsePost->assertStatus(403);
});

test('Cannot create voucher with amount 0 or negative', function () {
    $this->actingAs($this->soaUser);

    $response = $this->post('/vouchers', [
        'amount_cents' => 0,
        'purpose' => 'Test nol',
        'category' => 'OPERASIONAL',
    ]);

    $response->assertSessionHasErrors('amount_cents');
});

test('Cannot create voucher with amount exceeding imprest fund', function () {
    $this->actingAs($this->soaUser);

    // Imprest fund is 500.000.000 cents (Rp 5.000.000)
    $response = $this->post('/vouchers', [
        'amount_cents' => 500000001,
        'purpose' => 'Melebihi plafon',
        'category' => 'OPERASIONAL',
    ]);

    $response->assertSessionHasErrors('amount_cents');
});
