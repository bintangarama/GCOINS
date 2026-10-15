<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\VerifySessionAction;
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

    $this->adminUser = User::create([
        'store_id' => null,
        'nik' => 'ADMIN001',
        'name' => 'System Admin',
        'role' => 'SYSTEM_ADMIN',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->adminUser->syncRoles(['SYSTEM_ADMIN']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

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
        'name' => 'Store Accounting Clerk',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'Store Operations Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);

    StoreOpnameConfig::withoutGlobalScopes()->create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000,
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    OpnameItemDefinition::withoutGlobalScopes()->create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);
});

test('SAC cannot create user with SM, SS, or SYSTEM_ADMIN role', function (string $restrictedRole) {
    $this->actingAs($this->sacUser);

    $response = $this->post('/admin/users', [
        'nik' => 'NEWUSER01',
        'name' => 'New User',
        'role' => $restrictedRole,
        'pin' => '123456',
    ]);

    $response->assertSessionHasErrors('role');
    $this->assertDatabaseMissing('users', ['nik' => 'NEWUSER01']);
})->with(['SM', 'SS', 'SYSTEM_ADMIN']);

test('SAC can create user with SOA or SAC role', function (string $allowedRole) {
    $this->actingAs($this->sacUser);

    $response = $this->post('/admin/users', [
        'nik' => 'NEWUSER02',
        'name' => 'New Allowed User',
        'role' => $allowedRole,
        'pin' => '123456',
    ]);

    $response->assertRedirect('/admin/users');
    $this->assertDatabaseHas('users', [
        'nik' => 'NEWUSER02',
        'role' => $allowedRole,
        'store_id' => $this->store->id,
    ]);
})->with(['SOA', 'SAC']);

test('SM can create user with SS role', function () {
    $this->actingAs($this->smUser);

    $response = $this->post('/admin/users', [
        'nik' => 'NEWSS01',
        'name' => 'New Supervisor',
        'role' => 'SS',
        'pin' => '123456',
    ]);

    $response->assertRedirect('/admin/users');
    $this->assertDatabaseHas('users', [
        'nik' => 'NEWSS01',
        'role' => 'SS',
    ]);
});

test('SAC cannot update user to SM or SS role', function (string $targetRole) {
    $this->actingAs($this->sacUser);

    $response = $this->put("/admin/users/{$this->soaUser->id}", [
        'name' => 'Escalated SOA',
        'role' => $targetRole,
    ]);

    $response->assertSessionHasErrors('role');
    $this->soaUser->refresh();
    expect($this->soaUser->role)->toBe('SOA');
})->with(['SM', 'SS', 'SYSTEM_ADMIN']);

test('user cannot update their own account via admin user management', function () {
    $this->actingAs($this->smUser);

    $response = $this->put("/admin/users/{$this->smUser->id}", [
        'name' => 'Self Renamed SM',
        'role' => 'SM',
    ]);

    $response->assertStatus(403);
});

test('SAC cannot reset PIN of SM, SS, or SYSTEM_ADMIN', function (User $targetUser) {
    $this->actingAs($this->sacUser);

    $response = $this->post("/admin/users/{$targetUser->id}/reset-pin", [
        'pin' => '654321',
    ]);

    $response->assertStatus(403);
})->with([
    'SM' => fn () => $this->smUser,
    'SS' => fn () => $this->ssUser,
    'ADMIN' => fn () => $this->adminUser,
]);

test('SAC cannot toggle active status of SM, SS, or SYSTEM_ADMIN', function (User $targetUser) {
    $this->actingAs($this->sacUser);

    $response = $this->post("/admin/users/{$targetUser->id}/toggle-status");

    $response->assertStatus(403);
})->with([
    'SM' => fn () => $this->smUser,
    'SS' => fn () => $this->ssUser,
    'ADMIN' => fn () => $this->adminUser,
]);

test('user cannot reset their own PIN via admin endpoint', function () {
    $this->actingAs($this->smUser);

    $response = $this->post("/admin/users/{$this->smUser->id}/reset-pin", [
        'pin' => '999888',
    ]);

    $response->assertStatus(403);
});

test('reset PIN requires at least 6 digits', function () {
    $this->actingAs($this->smUser);

    $response = $this->post("/admin/users/{$this->soaUser->id}/reset-pin", [
        'pin' => '12345', // only 5 digits
    ]);

    $response->assertSessionHasErrors('pin');
});

test('reset PIN flash message does not echo plain PIN', function () {
    $this->actingAs($this->smUser);

    $newPin = '876543';
    $response = $this->post("/admin/users/{$this->soaUser->id}/reset-pin", [
        'pin' => $newPin,
    ]);

    $response->assertRedirect('/admin/users');
    $response->assertSessionMissing('success', "ke: {$newPin}");
    expect(session('success'))->not->toContain($newPin);
});

test('upload signed BA scan cannot overwrite existing scan on approved session', function () {
    $session = app(OpenSessionAction::class)->execute($this->sacUser);
    app(SubmitSessionAction::class)->execute($session, $this->sacUser);
    app(VerifySessionAction::class)->execute($session, $this->ssUser);
    app(SignOffSessionAction::class)->execute($session, ['confirm_understanding' => true], $this->smUser);

    $file1 = UploadedFile::fake()->create('signed-ba-scan-1.pdf', 500, 'application/pdf');

    // First upload succeeds
    $response1 = $this->actingAs($this->sacUser)->post("/opname/{$session->id}/signed-ba", [
        'signed_ba' => $file1,
    ]);
    $response1->assertRedirect();
    $session->refresh();
    expect($session->signed_ba_scan_url)->not->toBeNull();

    // Second upload attempt to overwrite on APPROVED session is rejected
    $file2 = UploadedFile::fake()->create('signed-ba-scan-2.pdf', 500, 'application/pdf');
    $response2 = $this->actingAs($this->sacUser)->post("/opname/{$session->id}/signed-ba", [
        'signed_ba' => $file2,
    ]);
    $response2->assertSessionHas('error');
});
