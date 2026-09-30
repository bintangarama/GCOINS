<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\RejectSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\VerifySessionAction;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

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
        'imprest_fund_cents' => 500000000, // Rp 5.000.000
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

    $this->def100k = OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    // SAC User
    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC User',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    // SS User
    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Store Supervisor',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    // SM User
    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    // Other Store SM
    $this->otherSmUser = User::create([
        'store_id' => $this->otherStore->id,
        'nik' => 'SM002',
        'name' => 'Other Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->otherSmUser->syncRoles(['SM']);
});

test('T-STM-06: Opname lifecycle DRAFT -> SUBMITTED -> VERIFIED_SS -> APPROVED', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    expect($session->status)->toBe(CashOpnameSession::STATUS_DRAFT);

    // 1. Submit by SAC
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    expect($submitted->status)->toBe(CashOpnameSession::STATUS_SUBMITTED);

    // 2. Witness verification by SS
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);
    expect($verified->status)->toBe(CashOpnameSession::STATUS_VERIFIED_SS)
        ->and($verified->verified_by_ss_id)->toBe($this->ssUser->id)
        ->and($verified->verified_ss_at)->not->toBeNull();

    // 3. Final Sign-off by SM
    $approved = app(SignOffSessionAction::class)->execute($verified, [
        'confirm_understanding' => true,
        'notes' => 'Kas opname telah diperiksa dan disetujui sesuai fisik brankas.',
    ], $this->smUser);

    expect($approved->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved->approved_by_sm_id)->toBe($this->smUser->id)
        ->and($approved->approved_sm_at)->not->toBeNull()
        ->and($approved->notes)->toContain('Kas opname telah diperiksa')
        ->and($approved->isLocked())->toBeTrue()
        ->and($approved->isApproved())->toBeTrue();
});

test('T-STM-07: SS reject returns session to DRAFT with reason', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);

    $rejected = app(RejectSessionAction::class)->execute($submitted, [
        'reason' => 'Fisik uang Rp 100.000 tidak sesuai hitungan pada lembar kas.',
    ], $this->ssUser);

    expect($rejected->status)->toBe(CashOpnameSession::STATUS_DRAFT)
        ->and($rejected->notes)->toContain('Fisik uang Rp 100.000 tidak sesuai hitungan');

    // Audit log records rejection
    $audit = AuditLog::where('entity_id', $session->id)
        ->where('action', 'REJECT_OPNAME')
        ->first();

    expect($audit)->not->toBeNull()
        ->and($audit->performed_by_id)->toBe($this->ssUser->id);
});

test('T-STM-08: SM reject returns session to DRAFT and resets SS verification', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);

    expect($verified->verified_by_ss_id)->toBe($this->ssUser->id);

    $rejected = app(RejectSessionAction::class)->execute($verified, [
        'reason' => 'Periksa kembali mutasi BRI yang belum diinput.',
    ], $this->smUser);

    expect($rejected->status)->toBe(CashOpnameSession::STATUS_DRAFT)
        ->and($rejected->verified_by_ss_id)->toBeNull()
        ->and($rejected->verified_ss_at)->toBeNull()
        ->and($rejected->notes)->toContain('Periksa kembali mutasi BRI');
});

test('T-RBAC-03: SS cannot sign-off opname (only SM)', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);

    expect(fn () => app(SignOffSessionAction::class)->execute($verified, [
        'confirm_understanding' => true,
    ], $this->ssUser))->toThrow(AuthorizationException::class);

    // Also via HTTP
    $response = $this->actingAs($this->ssUser)
        ->post("/opname/{$session->id}/sign-off", [
            'confirm_understanding' => true,
        ]);

    $response->assertForbidden();
});

test('SM from another store cannot sign-off or verify opname', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);

    expect(fn () => app(SignOffSessionAction::class)->execute($verified, [
        'confirm_understanding' => true,
    ], $this->otherSmUser))->toThrow(AuthorizationException::class);

    $response = $this->actingAs($this->otherSmUser)
        ->post("/opname/{$session->id}/sign-off", [
            'confirm_understanding' => true,
        ]);

    // Cross-store query is blocked by HasStoreScope (404 Not Found) or Policy (403 Forbidden)
    expect($response->status())->toBeIn([403, 404]);
});

test('SM sign-off requires confirm_understanding', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);

    expect(fn () => app(SignOffSessionAction::class)->execute($verified, [
        'confirm_understanding' => false,
    ], $this->smUser))->toThrow(InvalidArgumentException::class);

    $response = $this->actingAs($this->smUser)
        ->post("/opname/{$session->id}/sign-off", [
            'confirm_understanding' => false,
        ]);

    $response->assertSessionHasErrors('confirm_understanding');
});

test('Rule 4 & 4.6: SM sign-off captures immutable snapshot in AuditLog', function () {
    // Create a disbursed voucher to verify snapshotting
    $voucher = PettyCashVoucher::create([
        'store_id' => $this->store->id,
        'voucher_number' => 'V-TEST-001',
        'requester_id' => $this->sacUser->id,
        'purpose' => 'Pembelian ATK Kasir',
        'amount_cents' => 15000000, // Rp 150.000
        'category' => 'OPERATIONAL',
        'status' => PettyCashVoucher::STATUS_DISBURSED,
        'disbursed_at' => now(),
    ]);

    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    $submitted = app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    $verified = app(VerifySessionAction::class)->execute($submitted, $this->ssUser);

    $approved = app(SignOffSessionAction::class)->execute($verified, [
        'confirm_understanding' => true,
        'notes' => 'Persetujuan dengan voucher snapshot.',
    ], $this->smUser);

    $audit = AuditLog::where('entity_id', $session->id)
        ->where('action', 'SIGN_OFF_SM')
        ->first();

    expect($audit)->not->toBeNull()
        ->and($audit->new_values)->toHaveKey('snapshot')
        ->and($audit->new_values['snapshot'])->toHaveKeys(['vouchers_disbursed', 'item_counts', 'sub_ledger'])
        ->and(count($audit->new_values['snapshot']['vouchers_disbursed']))->toBeGreaterThanOrEqual(1)
        ->and($audit->new_values['snapshot']['vouchers_disbursed'][0]['id'])->toBe($voucher->id);
});

test('Rule 3: Carry-Forward Chain links approved V_current to next session V_prev', function () {
    $session1 = app(OpenSessionAction::class)->execute($this->sacUser);
    // Artificially simulate variance on session 1
    $session1->current_variance_cents = -5000000; // -Rp 50.000
    $session1->status = CashOpnameSession::STATUS_VERIFIED_SS;
    $session1->verified_by_ss_id = $this->ssUser->id;
    $session1->save();

    // SM signs off session 1
    app(SignOffSessionAction::class)->execute($session1, [
        'confirm_understanding' => true,
    ], $this->smUser);

    // Open next session (session 2)
    $session2 = app(OpenSessionAction::class)->execute($this->sacUser);

    expect($session2->id)->not->toBe($session1->id)
        ->and($session2->previous_variance_cents)->toBe(-5000000)
        ->and($session2->target_reconciled_cents)->toBe(500000000 + (-5000000)); // Imprest + V_prev
});

test('HTTP workflow endpoints: submit, verify, reject-ss, sign-off, reject-sm', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    // Submit HTTP
    $this->actingAs($this->sacUser)
        ->post("/opname/{$session->id}/submit")
        ->assertRedirect();

    expect($session->fresh()->status)->toBe(CashOpnameSession::STATUS_SUBMITTED);

    // Verify HTTP
    $this->actingAs($this->ssUser)
        ->post("/opname/{$session->id}/verify")
        ->assertRedirect();

    expect($session->fresh()->status)->toBe(CashOpnameSession::STATUS_VERIFIED_SS);

    // Reject by SM HTTP
    $this->actingAs($this->smUser)
        ->post("/opname/{$session->id}/reject-sm", [
            'reason' => 'Ada kekeliruan fisik uang',
        ])
        ->assertRedirect();

    expect($session->fresh()->status)->toBe(CashOpnameSession::STATUS_DRAFT);

    // Resubmit and re-verify
    $this->actingAs($this->sacUser)->post("/opname/{$session->id}/submit");
    $this->actingAs($this->ssUser)->post("/opname/{$session->id}/verify");

    // Sign off HTTP
    $this->actingAs($this->smUser)
        ->post("/opname/{$session->id}/sign-off", [
            'confirm_understanding' => true,
            'notes' => 'Semua sudah beres.',
        ])
        ->assertRedirect();

    expect($session->fresh()->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($session->fresh()->isLocked())->toBeTrue();
});
