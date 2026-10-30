<?php

use App\Actions\Voucher\UpdateVoucherAction;
use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Staff',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Officer',
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
});

test('T-UDV-01: Owner can view edit page and update own DRAFT voucher with audit log', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 10000000,
        'receipt_date' => '2026-10-28',
        'purpose' => 'Beli kertas HVS',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
    ]);

    $this->actingAs($this->soaUser)
        ->get("/vouchers/{$voucher->id}/edit")
        ->assertOk();

    $response = $this->actingAs($this->soaUser)
        ->put("/vouchers/{$voucher->id}", [
            'amount_cents' => 12500000,
            'receipt_date' => '2026-10-29',
            'purpose' => 'Beli kertas HVS & map arsip',
            'category' => 'STRUK_KASIR',
            'is_submit' => false,
        ]);

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_DRAFT)
        ->and($voucher->amount_cents)->toBe(12500000)
        ->and($voucher->receipt_date->toDateString())->toBe('2026-10-29')
        ->and($voucher->purpose)->toBe('Beli kertas HVS & map arsip')
        ->and($voucher->category)->toBe('STRUK_KASIR');

    $audit = AuditLog::where('entity_name', 'PettyCashVoucher')
        ->where('entity_id', $voucher->id)
        ->where('action', 'UPDATE_VOUCHER')
        ->first();

    expect($audit)->not->toBeNull()
        ->and($audit->old_values['amount_cents'])->toBe(10000000)
        ->and($audit->old_values['category'])->toBe('OPERASIONAL')
        ->and($audit->new_values['amount_cents'])->toBe(12500000)
        ->and($audit->new_values['category'])->toBe('STRUK_KASIR');
});

test('T-UDV-02: Owner can update DRAFT and submit directly while keeping existing receipt attachment', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 10000000,
        'receipt_date' => '2026-10-28',
        'purpose' => 'Konsumsi rapat pagi',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
        'receipt_image_url' => '/storage/vouchers/existing-receipt.webp',
    ]);

    $response = $this->actingAs($this->soaUser)
        ->put("/vouchers/{$voucher->id}", [
            'amount_cents' => 11000000,
            'receipt_date' => '2026-10-28',
            'purpose' => 'Konsumsi rapat pagi toko',
            'category' => 'KONSUMSI',
            'is_submit' => true,
        ]);

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($voucher->category)->toBe('KONSUMSI')
        ->and($voucher->amount_cents)->toBe(11000000)
        ->and($voucher->receipt_image_url)->toBe('/storage/vouchers/existing-receipt.webp');

    expect(
        AuditLog::where('entity_id', $voucher->id)
            ->where('action', 'SUBMIT_VOUCHER')
            ->exists()
    )->toBeTrue();
});

test('T-UDV-03: Owner can upload a new PDF receipt while editing and submitting a DRAFT', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 8000000,
        'purpose' => 'Ongkir ekspedisi',
        'category' => 'LOGISTIK',
        'status' => PettyCashVoucher::STATUS_DRAFT,
        'receipt_image_url' => null,
    ]);

    $pdf = UploadedFile::fake()->create('resi-ekspedisi.pdf', 300, 'application/pdf');

    $response = $this->actingAs($this->soaUser)
        ->post("/vouchers/{$voucher->id}", [
            '_method' => 'PUT',
            'amount_cents' => 8500000,
            'receipt_date' => '2026-10-30',
            'purpose' => 'Ongkir ekspedisi dokumen',
            'category' => 'LOGISTIK',
            'receipt_image' => $pdf,
            'is_submit' => true,
        ]);

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($voucher->amount_cents)->toBe(8500000)
        ->and($voucher->receipt_image_url)->toEndWith('.pdf');
});

test('T-UDV-04: Submitting from edit fails with 422 if receipt is missing or removed (Rule 15)', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '004/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Beli lakban',
        'category' => 'LOGISTIK',
        'status' => PettyCashVoucher::STATUS_DRAFT,
        'receipt_image_url' => '/storage/vouchers/existing.webp',
    ]);

    $response = $this->actingAs($this->soaUser)
        ->from("/vouchers/{$voucher->id}/edit")
        ->put("/vouchers/{$voucher->id}", [
            'amount_cents' => 5000000,
            'purpose' => 'Beli lakban',
            'category' => 'LOGISTIK',
            'remove_receipt_image' => true,
            'is_submit' => true,
        ]);

    $response->assertRedirect("/vouchers/{$voucher->id}/edit");
    $response->assertSessionHasErrors('receipt_image');

    expect($voucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_DRAFT);
});

test('T-UDV-05: Non-owner cannot view edit page or update another users DRAFT voucher', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '005/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Beli baterai',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
    ]);

    $this->actingAs($this->sacUser)
        ->get("/vouchers/{$voucher->id}/edit")
        ->assertForbidden();

    $this->actingAs($this->sacUser)
        ->put("/vouchers/{$voucher->id}", [
            'amount_cents' => 9900000,
            'purpose' => 'Ubah paksa',
            'category' => 'OPERASIONAL',
        ])
        ->assertForbidden();

    expect($voucher->fresh()->amount_cents)->toBe(5000000);
});

test('T-UDV-06: Owner cannot edit or update voucher once SUBMITTED (HTTP 403 & Action guard)', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '006/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 15000000,
        'purpose' => 'Perbaikan lampu',
        'category' => 'MAINTENANCE',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/existing.webp',
    ]);

    $this->actingAs($this->soaUser)
        ->get("/vouchers/{$voucher->id}/edit")
        ->assertForbidden();

    $this->actingAs($this->soaUser)
        ->put("/vouchers/{$voucher->id}", [
            'amount_cents' => 15000000,
            'purpose' => 'Perbaikan lampu',
            'category' => 'OPERASIONAL',
        ])
        ->assertForbidden();

    $action = app(UpdateVoucherAction::class);
    expect(fn () => $action->execute($voucher, [
        'amount_cents' => 15000000,
        'purpose' => 'Perbaikan lampu',
        'category' => 'OPERASIONAL',
    ], $this->soaUser))->toThrow(InvalidVoucherStateException::class);
});
