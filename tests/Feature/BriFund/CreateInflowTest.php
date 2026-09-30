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
});

test('T-STM-09: BRI INFLOW is immediately APPROVED upon creation', function () {
    $posting = $this->createAction->execute([
        'category' => 'B2B',
        'entity_name' => 'SMA Negeri 1 Karawang',
        'type' => 'INFLOW',
        'amount_cents' => 150000000, // Rp 1.500.000
        'purpose' => 'Pembayaran buku paket kurikulum',
    ], $this->sacUser);

    expect($posting)->toBeInstanceOf(BriFundPosting::class);
    expect($posting->status)->toBe('APPROVED');
    expect($posting->type)->toBe('INFLOW');
    expect($posting->amount_cents)->toBe(150000000);
});

test('BRI INFLOW creates audit log entry with CREATE_BRI_INFLOW action', function () {
    $posting = $this->createAction->execute([
        'category' => 'EVENT',
        'entity_name' => 'Bazaar Gramedia Fest',
        'type' => 'INFLOW',
        'amount_cents' => 200000000,
        'purpose' => 'Setoran harian event',
    ], $this->sacUser, '127.0.0.1');

    $auditLog = AuditLog::where('entity_id', $posting->id)
        ->where('entity_name', 'BriFundPosting')
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->action)->toBe('CREATE_BRI_INFLOW');
    expect($auditLog->performed_by_id)->toBe($this->sacUser->id);
    expect($auditLog->new_values['amount_cents'])->toBe(200000000);
});

test('BRI INFLOW with CUSTOM category requires custom_category_name', function () {
    expect(function () {
        $this->createAction->execute([
            'category' => 'CUSTOM',
            'entity_name' => 'Pameran Kaligrafi',
            'type' => 'INFLOW',
            'amount_cents' => 100000000,
            'purpose' => 'Sewa space booth',
            // custom_category_name is missing
        ], $this->sacUser);
    })->toThrow(InvalidArgumentException::class);
});

test('BRI INFLOW via HTTP stores successfully and redirects', function () {
    $response = $this->actingAs($this->sacUser)
        ->post(route('bri-funds.store'), [
            'category' => 'AKSEL',
            'entity_name' => 'Sekolah Lentera Harapan',
            'type' => 'INFLOW',
            'amount_cents' => 75000000,
            'purpose' => 'Penjualan kanvasing buku cerita',
        ]);

    $response->assertRedirect(route('bri-funds.postings'));
    $this->assertDatabaseHas('bri_fund_postings', [
        'category' => 'AKSEL',
        'entity_name' => 'Sekolah Lentera Harapan',
        'status' => 'APPROVED',
        'type' => 'INFLOW',
        'amount_cents' => 75000000,
    ]);
});
