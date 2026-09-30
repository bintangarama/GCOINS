<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\VerifySessionAction;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
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

    StoreOpnameConfig::create([
        'store_id' => $this->otherStore->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000,
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
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

    $this->otherUser = User::create([
        'store_id' => $this->otherStore->id,
        'nik' => 'SM999',
        'name' => 'Other Store SM',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->otherUser->syncRoles(['SM']);
});

test('GET /opname renders session history list with paginated sessions', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    $response = $this->actingAs($this->sacUser)->get('/opname');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Opname/Index')
            ->has('sessions.data', 1)
            ->where('sessions.data.0.id', $session->id)
            ->has('stats')
        );
});

test('GET /opname filters sessions by status and search', function () {
    $session1 = app(OpenSessionAction::class)->execute($this->sacUser);

    // Filter by DRAFT -> should match session1
    $responseDraft = $this->actingAs($this->sacUser)->get('/opname?status=DRAFT');
    $responseDraft->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('sessions.data', 1)
        );

    // Filter by APPROVED -> should be empty
    $responseApproved = $this->actingAs($this->sacUser)->get('/opname?status=APPROVED');
    $responseApproved->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('sessions.data', 0)
        );

    // Search by opname number
    $responseSearch = $this->actingAs($this->sacUser)->get("/opname?search={$session1->opname_number}");
    $responseSearch->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('sessions.data', 1)
            ->where('sessions.data.0.opname_number', $session1->opname_number)
        );
});

test('GET /opname/{session} renders session detail page with pockets and vouchers', function () {
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => 'V-TEST-HIST-01',
        'requester_id' => $this->sacUser->id,
        'purpose' => 'Biaya Konsumsi Rapat Toko',
        'amount_cents' => 20000000,
        'category' => 'OPERATIONAL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_at' => now(),
    ]);

    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);
    $approved = app(SignOffSessionAction::class)->execute($verified, [
        'confirm_understanding' => true,
        'notes' => 'Tutup buku opname kas kecil disetujui.',
    ], $this->smUser);

    $response = $this->actingAs($this->smUser)->get("/opname/{$approved->id}");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Opname/Show')
            ->where('session.id', $approved->id)
            ->where('session.status', 'APPROVED')
            ->has('disbursedVouchers')
            ->has('session.item_counts')
            ->has('session.sub_ledger')
        );
});

test('Multi-tenancy: user from another store cannot view session detail', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    $response = $this->actingAs($this->otherUser)->get("/opname/{$session->id}");

    // Blocked by HasStoreScope (404) or Policy (403)
    expect($response->status())->toBeIn([403, 404]);
});
