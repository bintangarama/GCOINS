<?php

use App\Actions\Voucher\RecallVoucherAction;
use App\Actions\Voucher\ReclassifyVoucherCategoryAction;
use App\Exceptions\InvalidVoucherStateException;
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

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Staff',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

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
        'name' => 'SAC Officer',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

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

test('T-RRC-01: Requester can recall own SUBMITTED voucher back to DRAFT, fix category, and resubmit', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 15000000,
        'purpose' => 'Beli lakban paket',
        'category' => 'KONSUMSI',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    // Step 1: Recall back to DRAFT
    $this->actingAs($this->soaUser)
        ->post("/vouchers/{$voucher->id}/recall")
        ->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_DRAFT);

    $recallAudit = AuditLog::where('entity_id', $voucher->id)
        ->where('action', 'RECALL_VOUCHER')
        ->first();

    expect($recallAudit)->not->toBeNull()
        ->and($recallAudit->old_values['status'])->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($recallAudit->new_values['status'])->toBe(PettyCashVoucher::STATUS_DRAFT);

    // Step 2: Edit category and resubmit directly
    $this->actingAs($this->soaUser)
        ->put("/vouchers/{$voucher->id}", [
            'amount_cents' => 15000000,
            'purpose' => 'Beli lakban paket ekspedisi',
            'category' => 'LOGISTIK',
            'is_submit' => true,
        ])
        ->assertRedirect("/vouchers/{$voucher->id}");

    $voucher->refresh();
    expect($voucher->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED)
        ->and($voucher->category)->toBe('LOGISTIK')
        ->and($voucher->receipt_image_url)->toBe('/storage/vouchers/receipt.webp');
});

test('T-RRC-02: Non-owner cannot recall another users SUBMITTED voucher', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 10000000,
        'purpose' => 'Beli kertas',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->sacUser)
        ->post("/vouchers/{$voucher->id}/recall")
        ->assertForbidden();

    expect($voucher->fresh()->status)->toBe(PettyCashVoucher::STATUS_SUBMITTED);
});

test('T-RRC-03: Requester cannot recall voucher once APPROVED_SS or DISBURSED', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 10000000,
        'purpose' => 'Beli kertas',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
        'approved_by_id' => $this->ssUser->id,
        'approved_at' => now(),
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->soaUser)
        ->post("/vouchers/{$voucher->id}/recall")
        ->assertForbidden();

    $action = app(RecallVoucherAction::class);
    expect(fn () => $action->execute($voucher, $this->soaUser))
        ->toThrow(InvalidVoucherStateException::class);
});

test('T-RRC-04: SAC, SS, and SM can reclassify category on SUBMITTED, APPROVED_SS, and DISBURSED vouchers with audit log', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '004/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 18500000,
        'purpose' => 'Kertas thermal kasir 10 roll',
        'category' => 'KONSUMSI',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'approved_by_id' => $this->ssUser->id,
        'approved_at' => now()->subHour(),
        'disbursed_by_id' => $this->sacUser->id,
        'disbursed_at' => now(),
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->sacUser)
        ->from('/vouchers/settlement')
        ->put("/vouchers/{$voucher->id}/category", [
            'category' => 'STRUK_KASIR',
            'reason' => 'Koreksi kategori sebelum rekap KKCL',
        ])
        ->assertRedirect('/vouchers/settlement');

    $voucher->refresh();
    expect($voucher->category)->toBe('STRUK_KASIR')
        ->and($voucher->amount_cents)->toBe(18500000)
        ->and($voucher->status)->toBe(PettyCashVoucher::STATUS_DISBURSED)
        ->and($voucher->approved_by_id)->toBe($this->ssUser->id);

    $audit = AuditLog::where('entity_id', $voucher->id)
        ->where('action', 'RECLASSIFY_CATEGORY')
        ->first();

    expect($audit)->not->toBeNull()
        ->and($audit->old_values['category'])->toBe('KONSUMSI')
        ->and($audit->new_values['category'])->toBe('STRUK_KASIR')
        ->and($audit->new_values['reason'])->toBe('Koreksi kategori sebelum rekap KKCL');
});

test('T-RRC-05: SOA cannot directly reclassify category on active vouchers', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '005/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 9000000,
        'purpose' => 'Beli amplop',
        'category' => 'KONSUMSI',
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
        'approved_by_id' => $this->ssUser->id,
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->soaUser)
        ->put("/vouchers/{$voucher->id}/category", [
            'category' => 'OPERASIONAL',
        ])
        ->assertForbidden();

    expect($voucher->fresh()->category)->toBe('KONSUMSI');
});

test('T-RRC-06: Category is permanently locked once voucher is SETTLED or REJECTED (Rule 16 immutability)', function () {
    $settledVoucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '006/KKCL/10435/X/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 12000000,
        'purpose' => 'Perbaikan engsel pintu',
        'category' => 'MAINTENANCE',
        'status' => PettyCashVoucher::STATUS_SETTLED,
        'settled_at' => now(),
        'receipt_image_url' => '/storage/vouchers/receipt.webp',
    ]);

    $this->actingAs($this->sacUser)
        ->put("/vouchers/{$settledVoucher->id}/category", [
            'category' => 'OPERASIONAL',
        ])
        ->assertForbidden();

    $this->actingAs($this->smUser)
        ->put("/vouchers/{$settledVoucher->id}/category", [
            'category' => 'OPERASIONAL',
        ])
        ->assertForbidden();

    $action = app(ReclassifyVoucherCategoryAction::class);
    expect(fn () => $action->execute($settledVoucher, 'OPERASIONAL', $this->sacUser))
        ->toThrow(InvalidVoucherStateException::class);

    expect($settledVoucher->fresh()->category)->toBe('MAINTENANCE');
});

