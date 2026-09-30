<?php

use App\Actions\BriFund\ApproveOutflowAction;
use App\Actions\BriFund\CreatePostingAction;
use App\Actions\BriFund\RejectOutflowAction;
use App\Exceptions\InvalidBriPostingStateException;
use App\Models\AuditLog;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

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

    $this->createAction = app(CreatePostingAction::class);
    $this->approveAction = app(ApproveOutflowAction::class);
    $this->rejectAction = app(RejectOutflowAction::class);

    // Initial deposit: Rp 5.000.000
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'INFLOW',
        'amount_cents' => 500000000,
        'purpose' => 'Deposit awal',
    ], $this->sacUser);
});

test('ApproveOutflowAction transitions status to APPROVED and sets approver info', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran kas',
    ], $this->sacUser);

    expect($outflow->status)->toBe('PENDING_SS');

    $approved = $this->approveAction->execute($outflow, $this->ssUser, '10.0.0.1');

    expect($approved->status)->toBe('APPROVED');
    expect($approved->approved_by_id)->toBe($this->ssUser->id);
    expect($approved->approved_at)->not->toBeNull();

    // Verify Audit Log
    $auditLog = AuditLog::where('entity_id', $approved->id)
        ->where('action', 'APPROVE_BRI_OUTFLOW')
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->performed_by_id)->toBe($this->ssUser->id);
    expect($auditLog->ip_address)->toBe('10.0.0.1');
});

test('RejectOutflowAction transitions status to REJECTED with mandatory reason', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran kas',
    ], $this->sacUser);

    $reason = 'Nomor rekening transfer tujuan tidak terverifikasi.';
    $rejected = $this->rejectAction->execute($outflow, $this->ssUser, $reason, '10.0.0.2');

    expect($rejected->status)->toBe('REJECTED');
    expect($rejected->rejection_reason)->toBe($reason);
    expect($rejected->approved_by_id)->toBe($this->ssUser->id);

    // Verify Audit Log
    $auditLog = AuditLog::where('entity_id', $rejected->id)
        ->where('action', 'REJECT_BRI_OUTFLOW')
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->action)->toBe('REJECT_BRI_OUTFLOW');
    expect($auditLog->new_values['rejection_reason'])->toBe($reason);
});

test('RejectOutflowAction throws exception if rejection reason is empty', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran kas',
    ], $this->sacUser);

    expect(function () use ($outflow) {
        $this->rejectAction->execute($outflow, $this->ssUser, '   ');
    })->toThrow(InvalidArgumentException::class);
});

test('Cannot approve an already APPROVED posting (invalid state transition)', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran kas',
    ], $this->sacUser);

    $this->approveAction->execute($outflow, $this->ssUser);

    // Second approve attempt
    expect(function () use ($outflow) {
        $this->approveAction->execute($outflow, $this->ssUser);
    })->toThrow(InvalidBriPostingStateException::class);
});

test('Cannot reject an already APPROVED posting (invalid state transition)', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran kas',
    ], $this->sacUser);

    $this->approveAction->execute($outflow, $this->ssUser);

    expect(function () use ($outflow) {
        $this->rejectAction->execute($outflow, $this->ssUser, 'Alasan tolak');
    })->toThrow(InvalidBriPostingStateException::class);
});

test('Reject outflow via HTTP route enforces validation', function () {
    $outflow = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Pengeluaran kas',
    ], $this->sacUser);

    // Empty rejection reason fails validation
    $response = $this->actingAs($this->ssUser)
        ->post(route('bri-funds.reject', $outflow), [
            'rejection_reason' => '',
        ]);

    $response->assertSessionHasErrors(['rejection_reason']);

    // Valid rejection reason succeeds
    $validResponse = $this->actingAs($this->ssUser)
        ->post(route('bri-funds.reject', $outflow), [
            'rejection_reason' => 'Lampiran rekening tidak sesuai SPK',
        ]);

    $validResponse->assertRedirect();
    expect($outflow->fresh()->status)->toBe('REJECTED');
    expect($outflow->fresh()->rejection_reason)->toBe('Lampiran rekening tidak sesuai SPK');
});
