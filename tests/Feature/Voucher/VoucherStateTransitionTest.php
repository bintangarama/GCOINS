<?php

use App\Actions\Voucher\ApproveVoucherAction;
use App\Actions\Voucher\BatchSettleVouchersAction;
use App\Actions\Voucher\CancelVoucherAction;
use App\Actions\Voucher\DisburseVoucherAction;
use App\Actions\Voucher\RefundVoucherAction;
use App\Actions\Voucher\SubmitVoucherAction;
use App\Exceptions\InvalidVoucherStateException;
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
        'name' => 'SAC Staff',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Supervisor',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA User',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->submitAction = app(SubmitVoucherAction::class);
    $this->approveAction = app(ApproveVoucherAction::class);
    $this->disburseAction = app(DisburseVoucherAction::class);
    $this->settleAction = app(BatchSettleVouchersAction::class);
    $this->cancelAction = app(CancelVoucherAction::class);
    $this->refundAction = app(RefundVoucherAction::class);
});

test('T-STM-01: Voucher DRAFT -> SUBMITTED valid', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Kertas struk',
        'category' => 'STRUK_KASIR',
        'status' => PettyCashVoucher::STATUS_DRAFT,
        'receipt_image_url' => '/storage/vouchers/struk.webp',
    ]);

    $this->submitAction->execute($voucher, $this->soaUser);

    expect($voucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED);

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'SUBMIT_VOUCHER',
    ]);
});

test('T-STM-02: Voucher SUBMITTED -> APPROVED_SS valid', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Kertas struk',
        'category' => 'STRUK_KASIR',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/struk.webp',
    ]);

    $this->approveAction->execute($voucher, $this->ssUser);

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_APPROVED_SS)
        ->and($voucher->approved_by_id)->toBe($this->ssUser->id)
        ->and($voucher->approved_at)->not->toBeNull();

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'APPROVE_VOUCHER',
    ]);
});

test('T-STM-03: Voucher APPROVED_SS -> DISBURSED valid', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Kertas struk',
        'category' => 'STRUK_KASIR',
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
        'approved_by_id' => $this->ssUser->id,
        'approved_at' => now(),
        'receipt_image_url' => '/storage/vouchers/struk.webp',
    ]);

    $this->disburseAction->execute($voucher, $this->sacUser);

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_DISBURSED)
        ->and($voucher->disbursed_by_id)->toBe($this->sacUser->id)
        ->and($voucher->disbursed_at)->not->toBeNull();

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'DISBURSE_VOUCHER',
    ]);
});

test('T-STM-04: Voucher DISBURSED -> SETTLED valid (batch)', function () {
    $voucher1 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '004/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Kertas struk',
        'category' => 'STRUK_KASIR',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    $voucher2 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '005/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 3000000,
        'purpose' => 'Bensin motor',
        'category' => 'LOGISTIK',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    $settled = $this->settleAction->execute([$voucher1->id, $voucher2->id], $this->sacUser);

    expect($settled)->toHaveCount(2)
        ->and($voucher1->fresh()->status)->toBe(PettyCashVoucher::STATUS_SETTLED)
        ->and($voucher2->fresh()->status)->toBe(PettyCashVoucher::STATUS_SETTLED);

    $this->assertDatabaseHas('audit_logs', [
        'entity_id' => $voucher1->id,
        'action' => 'SETTLE_VOUCHER',
    ]);
});

test('T-STM-05: Invalid state transitions are rejected with InvalidVoucherStateException', function () {
    $draftVoucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '006/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Test',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
    ]);

    // Cannot approve a DRAFT directly
    expect(fn () => $this->approveAction->execute($draftVoucher, $this->ssUser))
        ->toThrow(InvalidVoucherStateException::class);

    // Cannot disburse a DRAFT directly
    expect(fn () => $this->disburseAction->execute($draftVoucher, $this->sacUser))
        ->toThrow(InvalidVoucherStateException::class);

    // Cannot settle a DRAFT directly
    expect(fn () => $this->settleAction->execute([$draftVoucher->id], $this->sacUser))
        ->toThrow(InvalidVoucherStateException::class);
});

test('Post-disbursement lifecycle: DISBURSED -> REJECTED_REFUND_PENDING -> REFUNDED', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '007/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Test audit cancellation',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
    ]);

    // Cancel post-disbursement
    $this->cancelAction->execute($voucher, 'Kuitansi bermasalah saat audit internal', $this->sacUser);
    expect($voucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_REJECTED_REFUND_PENDING);

    // Confirm refund
    $this->refundAction->execute($voucher, $this->sacUser);
    expect($voucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_REFUNDED);
});
