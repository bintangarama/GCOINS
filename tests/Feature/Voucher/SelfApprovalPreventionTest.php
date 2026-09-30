<?php

use App\Actions\Voucher\ApproveVoucherAction;
use App\Exceptions\ForbiddenSelfApprovalException;
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

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Staff',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->approveAction = app(ApproveVoucherAction::class);
});

test('T-SAP-01: SAC cannot approve own voucher at Action layer (FORBIDDEN_SELF_APPROVAL exception)', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 15000000,
        'purpose' => 'Pengadaan ATK kasir',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test.webp',
    ]);

    expect(fn () => $this->approveAction->execute($voucher, $this->sacUser))
        ->toThrow(ForbiddenSelfApprovalException::class, 'FORBIDDEN_SELF_APPROVAL');
});

test('T-SAP-01 (HTTP): SAC cannot approve own voucher via HTTP route (returns 403)', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 15000000,
        'purpose' => 'Pengadaan ATK kasir',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test.webp',
    ]);

    $this->actingAs($this->sacUser);
    $response = $this->post("/vouchers/{$voucher->id}/approve");

    $response->assertStatus(403);
    $this->assertDatabaseHas('petty_cash_vouchers', [
        'id' => $voucher->id,
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'approved_by_id' => null,
    ]);
});

test('T-SAP-02: SAC can approve voucher requested by others (e.g. SOA)', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 7500000,
        'purpose' => 'Bensin kurir logistik',
        'category' => 'LOGISTIK',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test.webp',
    ]);

    // Test at Action layer
    $approvedVoucher = $this->approveAction->execute($voucher, $this->sacUser);

    expect($approvedVoucher->status)->toBe(PettyCashVoucher::STATUS_APPROVED_SS)
        ->and($approvedVoucher->approved_by_id)->toBe($this->sacUser->id);

    $this->assertDatabaseHas('petty_cash_vouchers', [
        'id' => $voucher->id,
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
        'approved_by_id' => $this->sacUser->id,
    ]);
});

test('T-SAP-03: SS can approve SAC own voucher', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/IX/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 20000000,
        'purpose' => 'Perbaikan AC kasir',
        'category' => 'MAINTENANCE',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test.webp',
    ]);

    // Test via HTTP route
    $this->actingAs($this->ssUser);
    $response = $this->post("/vouchers/{$voucher->id}/approve");

    $response->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_APPROVED_SS)
        ->and($voucher->approved_by_id)->toBe($this->ssUser->id);
});
