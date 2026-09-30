<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\VerifySessionAction;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\OpnameItemDefinition;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
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

    $this->otherStoreUser = User::create([
        'store_id' => $this->otherStore->id,
        'nik' => 'SM999',
        'name' => 'Other Store SM',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->otherStoreUser->syncRoles(['SM']);
});

test('SAC can upload physical signed BA scan on approved session', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    app(VerifySessionAction::class)->execute($session, $this->ssUser);
    app(SignOffSessionAction::class)->execute($session, ['confirm_understanding' => true], $this->smUser);

    $file = UploadedFile::fake()->create('signed-ba-scan.pdf', 500, 'application/pdf');

    $response = $this->actingAs($this->sacUser)->post("/opname/{$session->id}/signed-ba", [
        'signed_ba' => $file,
    ]);

    $response->assertRedirect();
    $session->refresh();

    expect($session->signed_ba_scan_url)->not->toBeNull()
        ->and($session->signed_ba_scan_url)->toContain('uploads/opname/10435');

    // Check Attachment created
    $attachment = Attachment::where('entity_id', $session->id)
        ->where('category', 'SIGNED_BA_SCAN')
        ->first();
    expect($attachment)->not->toBeNull()
        ->and($attachment->file_name)->toBe('signed-ba-scan.pdf')
        ->and($attachment->uploaded_by_id)->toBe($this->sacUser->id);

    // Check AuditLog created (Rule 10)
    $audit = AuditLog::where('entity_id', $session->id)
        ->where('action', 'UPLOAD_SIGNED_BA')
        ->first();
    expect($audit)->not->toBeNull()
        ->and($audit->performed_by_id)->toBe($this->sacUser->id)
        ->and($audit->new_values['signed_ba_scan_url'])->toBe($session->signed_ba_scan_url);
});

test('User cannot upload signed BA to another store session', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    app(VerifySessionAction::class)->execute($session, $this->ssUser);

    $file = UploadedFile::fake()->create('signed-ba.jpg', 200, 'image/jpeg');

    // Cross-store query fails with 404 due to HasStoreScope
    $this->actingAs($this->otherStoreUser)
        ->post("/opname/{$session->id}/signed-ba", [
            'signed_ba' => $file,
        ])
        ->assertNotFound();
});

test('Upload signed BA fails on DRAFT session', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);

    $file = UploadedFile::fake()->create('signed-ba.pdf', 300, 'application/pdf');

    $this->actingAs($this->sacUser)
        ->post("/opname/{$session->id}/signed-ba", [
            'signed_ba' => $file,
        ]);

    $session->refresh();
    expect($session->signed_ba_scan_url)->toBeNull();
});

test('Upload signed BA validates file type and max size', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    app(VerifySessionAction::class)->execute($session, $this->ssUser);

    // Invalid extension (.exe)
    $invalidFile = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');
    $this->actingAs($this->sacUser)
        ->post("/opname/{$session->id}/signed-ba", ['signed_ba' => $invalidFile])
        ->assertSessionHasErrors('signed_ba');

    // Oversized (>10MB)
    $oversizedFile = UploadedFile::fake()->create('huge.pdf', 12000, 'application/pdf');
    $this->actingAs($this->sacUser)
        ->post("/opname/{$session->id}/signed-ba", ['signed_ba' => $oversizedFile])
        ->assertSessionHasErrors('signed_ba');
});
