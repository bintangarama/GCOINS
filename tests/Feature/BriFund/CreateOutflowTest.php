<?php

use App\Actions\BriFund\CreatePostingAction;
use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
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

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Officer',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->createAction = app(CreatePostingAction::class);

    // Initial deposit: Rp 5.000.000
    $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'INFLOW',
        'amount_cents' => 500000000,
        'purpose' => 'Deposit awal',
    ], $this->sacUser);
});

test('T-STM-10: BRI OUTFLOW creates posting with status PENDING_SS', function () {
    $posting = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 150000000, // Rp 1.500.000
        'purpose' => 'Pengembalian kelebihan dana',
    ], $this->sacUser);

    expect($posting)->toBeInstanceOf(BriFundPosting::class);
    expect($posting->status)->toBe('PENDING_SS');
    expect($posting->type)->toBe('OUTFLOW');
    expect($posting->amount_cents)->toBe(150000000);
    expect($posting->approved_by_id)->toBeNull();
    expect($posting->approved_at)->toBeNull();
});

test('BRI OUTFLOW creates audit log with CREATE_BRI_OUTFLOW action', function () {
    $posting = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'OUTFLOW',
        'amount_cents' => 100000000,
        'purpose' => 'Penarikan dana',
    ], $this->sacUser, '192.168.1.1');

    $auditLog = AuditLog::where('entity_id', $posting->id)
        ->where('entity_name', 'BriFundPosting')
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->action)->toBe('CREATE_BRI_OUTFLOW');
    expect($auditLog->performed_by_id)->toBe($this->sacUser->id);
    expect($auditLog->ip_address)->toBe('192.168.1.1');
});

test('BRI OUTFLOW via HTTP succeeds within balance and redirects', function () {
    $response = $this->actingAs($this->sacUser)
        ->post(route('bri-funds.store'), [
            'category' => 'B2B',
            'entity_name' => 'SMA Negeri 1 Karawang',
            'type' => 'OUTFLOW',
            'amount_cents' => 200000000,
            'purpose' => 'Transfer pengembalian dana',
        ]);

    $response->assertRedirect(route('bri-funds.postings'));
    $this->assertDatabaseHas('bri_fund_postings', [
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'status' => 'PENDING_SS',
        'type' => 'OUTFLOW',
        'amount_cents' => 200000000,
    ]);
});
