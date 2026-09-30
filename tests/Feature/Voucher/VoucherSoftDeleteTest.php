<?php

use App\Actions\Voucher\DeleteVoucherAction;
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
        'name' => 'SOA User',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    $this->otherSoa = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA002',
        'name' => 'Other SOA',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->otherSoa->syncRoles(['SOA']);

    $this->deleteAction = app(DeleteVoucherAction::class);
});

test('T-DEL-01: Soft delete voucher DRAFT sets deleted_at and creates audit log', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Draft to delete',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
    ]);

    $this->deleteAction->execute($voucher, $this->soaUser);

    expect(PettyCashVoucher::find($voucher->id))->toBeNull()
        ->and(PettyCashVoucher::withTrashed()->find($voucher->id))->not->toBeNull()
        ->and(PettyCashVoucher::withTrashed()->find($voucher->id)->deleted_at)->not->toBeNull();

    $this->assertDatabaseHas('audit_logs', [
        'entity_name' => 'PettyCashVoucher',
        'entity_id' => $voucher->id,
        'action' => 'DELETE_VOUCHER',
    ]);
});

test('T-DEL-02: Soft deleted voucher is not shown in voucher index list', function () {
    $v1 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '001/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Active voucher',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_SUBMITTED,
    ]);

    $v2 = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '002/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 2000000,
        'purpose' => 'Deleted draft',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
    ]);

    $v2->delete();

    $this->actingAs($this->soaUser);
    $response = $this->get('/vouchers');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Voucher/Index')
        ->has('vouchers.data', 1)
        ->where('vouchers.data.0.id', $v1->id)
    );
});

test('User cannot delete someone else draft voucher', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => '003/KKCL/10435/IX/2026',
        'requester_id' => $this->soaUser->id,
        'amount_cents' => 5000000,
        'purpose' => 'Draft to delete',
        'category' => 'OPERASIONAL',
        'status' => PettyCashVoucher::STATUS_DRAFT,
    ]);

    $this->actingAs($this->otherSoa);
    $response = $this->delete("/vouchers/{$voucher->id}");

    $response->assertStatus(403);
    expect($voucher->fresh())->not->toBeNull();
});
