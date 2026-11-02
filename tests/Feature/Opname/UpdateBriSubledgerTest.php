<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\UpdateBriSubledgerAction;
use App\Actions\Voucher\CancelVoucherAction;
use App\Actions\Voucher\DisburseVoucherAction;
use App\Models\Attachment;
use App\Models\BriCustomAllocation;
use App\Models\BriFundPosting;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Auth\Access\AuthorizationException;
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
        'name' => 'SAC User',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA User',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    // Seed approved BRI postings
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'B2B',
        'entity_name' => 'SMK 1 Karawang',
        'type' => 'INFLOW',
        'amount_cents' => 100000000, // Rp 1.000.000
        'purpose' => 'Pembelian buku',
        'status' => BriFundPosting::STATUS_APPROVED,
        'created_by_id' => $this->sacUser->id,
    ]);

    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'EVENT',
        'entity_name' => 'Pameran Mall',
        'type' => 'INFLOW',
        'amount_cents' => 50000000, // Rp 500.000
        'purpose' => 'Penjualan event',
        'status' => BriFundPosting::STATUS_APPROVED,
        'created_by_id' => $this->sacUser->id,
    ]);

    $this->session = app(OpenSessionAction::class)->execute($this->sacUser);
});

test('T-BRI-02: K_bri = mutation - sum(allocations)', function () {
    $action = app(UpdateBriSubledgerAction::class);

    // Mutation = Rp 3.000.000 (300.000.000 cents)
    // Allocations: B2B (100.000.000) + EVENT (50.000.000) = 150.000.000 cents
    // Expected K_bri = 300.000.000 - 150.000.000 = 150.000.000 cents (Rp 1.500.000)
    $updatedSession = $action->execute(
        $this->session,
        ['bri_mutation_total_cents' => 300000000],
        $this->sacUser
    );

    expect($updatedSession->subLedger->net_kas_kecil_bri_cents)->toBe(150000000)
        ->and($updatedSession->bri_clean_balance_cents)->toBe(150000000)
        ->and($updatedSession->subLedger->b2b_allocation_cents)->toBe(100000000)
        ->and($updatedSession->subLedger->event_allocation_cents)->toBe(50000000);
});

test('T-BRI-02c: UpdateBriSubledgerAction adds bank_admin_fee_cents to K_bri', function () {
    $action = app(UpdateBriSubledgerAction::class);

    // Mutation = Rp 3.000.000 (300.000.000 cents)
    // Allocations: B2B (100.000.000) + EVENT (50.000.000) = 150.000.000 cents
    // Bank admin fee = Rp 80.000 (8.000.000 cents)
    // Expected K_bri = (300.000.000 - 150.000.000) + 8.000.000 = 158.000.000 cents (Rp 1.580.000)
    $updatedSession = $action->execute(
        $this->session,
        [
            'bri_mutation_total_cents' => 300000000,
            'bank_admin_fee_cents' => 8000000,
        ],
        $this->sacUser
    );

    expect($updatedSession->subLedger->bank_admin_fee_cents)->toBe(8000000)
        ->and($updatedSession->subLedger->net_kas_kecil_bri_cents)->toBe(158000000)
        ->and($updatedSession->bri_clean_balance_cents)->toBe(158000000);
});

test('UpdateBriSubledgerAction: handles statement proof photo upload', function () {
    $file = UploadedFile::fake()->image('statement.png');

    $action = app(UpdateBriSubledgerAction::class);
    $updatedSession = $action->execute(
        $this->session,
        [
            'bri_mutation_total_cents' => 200000000,
            'statement_proof' => $file,
        ],
        $this->sacUser
    );

    expect($updatedSession->subLedger->statement_proof_url)->not->toBeNull();

    $attachment = Attachment::where('entity_id', $this->session->id)
        ->where('category', 'BANK_STATEMENT')
        ->first();

    expect($attachment)->not->toBeNull()
        ->and($attachment->entity_type)->toBe('CASH_OPNAME_SESSION');
});

test('UpdateBriSubledgerAction: handles custom allocations correctly', function () {
    $action = app(UpdateBriSubledgerAction::class);

    $customs = [
        ['name' => 'Sewa Booth Mall', 'amount_cents' => 20000000, 'notes' => 'Tambahan booth'],
        ['name' => 'Parkir Khusus', 'amount_cents' => 5000000, 'notes' => 'Voucher parkir'],
    ];

    $updatedSession = $action->execute(
        $this->session,
        [
            'bri_mutation_total_cents' => 300000000,
            'custom_allocations' => $customs,
        ],
        $this->sacUser
    );

    // Total allocations = B2B (100.000.000) + EVENT (50.000.000) + CUSTOM (25.000.000) = 175.000.000
    // K_bri = 300.000.000 - 175.000.000 = 125.000.000
    expect($updatedSession->subLedger->custom_allocations_total_cents)->toBe(25000000)
        ->and($updatedSession->subLedger->net_kas_kecil_bri_cents)->toBe(125000000);

    $savedCustoms = BriCustomAllocation::where('sub_ledger_id', $updatedSession->subLedger->id)->get();
    expect($savedCustoms)->toHaveCount(2);
});

test('UpdateBriSubledgerAction: non-SAC cannot update BRI sub-ledger', function () {
    $action = app(UpdateBriSubledgerAction::class);

    expect(fn () => $action->execute($this->session, ['bri_mutation_total_cents' => 100000000], $this->soaUser))
        ->toThrow(AuthorizationException::class);
});

test('PUT /opname/{session}/bri-subledger: endpoint updates via HTTP', function () {
    $response = $this->actingAs($this->sacUser)
        ->put("/opname/{$this->session->id}/bri-subledger", [
            'bri_mutation_total_cents' => 450000000,
            'bank_admin_fee_cents' => 8000000,
        ]);

    $response->assertRedirect();
    $subLedger = $this->session->fresh()->subLedger;
    expect($subLedger->bri_mutation_total_cents)->toBe(450000000)
        ->and($subLedger->bank_admin_fee_cents)->toBe(8000000);
});

test('POST /opname/{session}/bri-sync: endpoint syncs allocations live', function () {
    // Add another approved posting after session opened
    BriFundPosting::create([
        'store_id' => $this->store->id,
        'category' => 'AKSEL',
        'entity_name' => 'Aksel Team',
        'type' => 'INFLOW',
        'amount_cents' => 30000000, // Rp 300.000
        'purpose' => 'Aksel sales',
        'status' => BriFundPosting::STATUS_APPROVED,
        'created_by_id' => $this->sacUser->id,
    ]);

    $response = $this->actingAs($this->sacUser)
        ->post("/opname/{$this->session->id}/bri-sync");

    $response->assertRedirect();
    expect($this->session->fresh()->subLedger->aksel_allocation_cents)->toBe(30000000);
});

test('PUT /opname/{session}/bri-subledger: requires bank_admin_fee_notes when fee > 0 on manual save', function () {
    $response = $this->actingAs($this->sacUser)
        ->put("/opname/{$this->session->id}/bri-subledger", [
            'bri_mutation_total_cents' => 450000000,
            'bank_admin_fee_cents' => 8000000,
            'bank_admin_fee_notes' => '',
            'is_autosave' => 0,
        ]);

    $response->assertSessionHasErrors(['bank_admin_fee_notes']);
});

test('Option B lifecycle: auto carry-forward, fee accumulation, and proportional auto-clearance on voucher disbursement', function () {
    $updateAction = app(UpdateBriSubledgerAction::class);
    $openAction = app(OpenSessionAction::class);

    // 1. Session 1: Set Rp 80.000 bank admin fee with notes and mark session APPROVED
    $updateAction->execute(
        $this->session,
        [
            'bri_mutation_total_cents' => 492000000,
            'bank_admin_fee_cents' => 8000000,
            'bank_admin_fee_notes' => 'Biaya admin bulanan Oktober',
        ],
        $this->sacUser
    );

    $this->session->update([
        'status' => CashOpnameSession::STATUS_APPROVED,
        'approved_sm_at' => now(),
    ]);

    // 2. Open Session 2 on next day -> Rp 80.000 is automatically carried forward
    $this->travel(1)->days();
    $session2 = $openAction->execute($this->sacUser);

    expect($session2->subLedger->bank_admin_fee_cents)->toBe(8000000)
        ->and($session2->subLedger->bank_admin_fee_notes)->toBe('Biaya admin bulanan Oktober');

    // 3. Before creating a voucher, bank fee increases in Session 2 from Rp 80.000 to Rp 100.000 (+Rp 20.000 BI-Fast)
    $updateAction->execute(
        $session2,
        [
            'bri_mutation_total_cents' => 640000000, // after 150M allocations = 490M + 100k fee = 500M
            'bank_admin_fee_cents' => 10000000,
            'bank_admin_fee_notes' => 'Admin 80rb + BI-Fast 20rb',
        ],
        $this->sacUser
    );

    expect($session2->fresh()->subLedger->bank_admin_fee_cents)->toBe(10000000)
        ->and($session2->fresh()->bri_clean_balance_cents)->toBe(500000000);

    // 4. Create & Disburse a partial voucher for the first Rp 80.000 linked to Session 1 sub-ledger
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'clears_sub_ledger_id' => $this->session->subLedger->id,
        'voucher_number' => '001/KKCL/10435/X/2026',
        'requester_id' => $this->sacUser->id,
        'amount_cents' => 8000000,
        'receipt_date' => now()->toDateString(),
        'purpose' => 'Biaya admin bulanan Oktober',
        'category' => 'LAINNYA',
        'status' => PettyCashVoucher::STATUS_APPROVED_SS,
    ]);

    app(DisburseVoucherAction::class)->execute($voucher, $this->sacUser);

    // Session 1 sub-ledger is marked cleared, and Session 2 draft fee is proportionally reduced to Rp 20.000!
    expect($this->session->fresh()->subLedger->cleared_by_voucher_id)->toBe($voucher->id)
        ->and($session2->fresh()->subLedger->bank_admin_fee_cents)->toBe(2000000)
        ->and($session2->fresh()->vouchers_total_cents)->toBe(8000000)
        ->and($session2->fresh()->bri_clean_balance_cents)->toBe(492000000)
        ->and($session2->fresh()->total_actual_cents)->toBe(500000000); // 0 physical + 80k voucher + 4.92M BRI = 5.00M (no double counting!)

    // 5. If voucher is cancelled, cleared_by_voucher_id is reopened
    app(CancelVoucherAction::class)->execute($voucher->fresh(), 'Revisi nominal', $this->sacUser);
    expect($this->session->fresh()->subLedger->cleared_by_voucher_id)->toBeNull();
});
