<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\UpdateBriSubledgerAction;
use App\Models\Attachment;
use App\Models\BriCustomAllocation;
use App\Models\BriFundPosting;
use App\Models\OpnameItemDefinition;
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
        ]);

    $response->assertRedirect();
    expect($this->session->fresh()->subLedger->bri_mutation_total_cents)->toBe(450000000);
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
