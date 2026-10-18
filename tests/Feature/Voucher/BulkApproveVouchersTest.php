<?php

use App\Actions\Voucher\BulkApproveVouchersAction;
use App\Exceptions\ForbiddenSelfApprovalException;
use App\Models\AuditLog;
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

    $this->bulkApproveAction = app(BulkApproveVouchersAction::class);
});

test('T-BAP-01: SS can bulk approve multiple submitted vouchers successfully', function () {
    $voucher1 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 15000000,
        'purpose' => 'Pengadaan ATK kasir 1',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test1.webp',
    ]);

    $voucher2 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/X/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 20000000,
        'purpose' => 'Pengadaan ATK kasir 2',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test2.webp',
    ]);

    $response = $this->actingAs($this->ssUser)
        ->post(route('vouchers.bulk-approve'), [
            'voucher_ids' => [$voucher1->id, $voucher2->id],
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect($voucher1->fresh()->status)->toBe(PettyCashVoucher::STATUS_APPROVED_SS)
        ->and($voucher1->fresh()->approved_by_id)->toBe($this->ssUser->id)
        ->and($voucher2->fresh()->status)->toBe(PettyCashVoucher::STATUS_APPROVED_SS)
        ->and($voucher2->fresh()->approved_by_id)->toBe($this->ssUser->id);

    $auditCount = AuditLog::whereIn('entity_id', [$voucher1->id, $voucher2->id])
        ->where('action', 'APPROVE_VOUCHER')
        ->count();

    expect($auditCount)->toBe(2);
});

test('T-BAP-02: SAC cannot bulk approve batch containing their own voucher (Anti Self-Approval atomicity)', function () {
    $soaVoucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 10000000,
        'purpose' => 'Buku folio',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test3.webp',
    ]);

    $ownVoucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '004/KKCL/10435/X/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 25000000,
        'purpose' => 'Plastik packing',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test4.webp',
    ]);

    $response = $this->actingAs($this->sacUser)
        ->post(route('vouchers.bulk-approve'), [
            'voucher_ids' => [$soaVoucher->id, $ownVoucher->id],
        ]);

    $response->assertForbidden();

    // Verify atomic rollback: neither voucher was approved
    expect($soaVoucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($ownVoucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED);
});

test('T-BAP-03: Action throws ForbiddenSelfApprovalException when SAC approves own voucher in batch', function () {
    $ownVoucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '005/KKCL/10435/X/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Materai',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test5.webp',
    ]);

    expect(fn () => $this->bulkApproveAction->execute([$ownVoucher->id], $this->sacUser))
        ->toThrow(ForbiddenSelfApprovalException::class);
});

test('T-BAP-04: Unauthorized roles (SOA) cannot bulk approve vouchers', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '006/KKCL/10435/X/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 15000000,
        'purpose' => 'Kertas struk',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/test6.webp',
    ]);

    $response = $this->actingAs($this->soaUser)
        ->post(route('vouchers.bulk-approve'), [
            'voucher_ids' => [$voucher->id],
        ]);

    $response->assertForbidden();
});
