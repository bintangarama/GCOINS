<?php

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

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Staff',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->soaUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'SOA Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soaUser->syncRoles(['SOA']);
});

test('sm and sac can view user list', function () {
    $this->actingAs($this->smUser);

    $response = $this->get('/admin/users');
    $response->assertStatus(200);

    $this->actingAs($this->sacUser);
    $response = $this->get('/admin/users');
    $response->assertStatus(200);
});

test('soa cannot view user list', function () {
    $this->actingAs($this->soaUser);

    $response = $this->get('/admin/users');
    $response->assertStatus(403);
});

test('sm can create a new user and audit log is recorded', function () {
    $this->actingAs($this->smUser);

    $response = $this->post('/admin/users', [
        'nik' => 'SOA002',
        'name' => 'Budi Santoso',
        'role' => 'SOA',
        'phone_number' => '081299998888',
        'pin' => '654321',
    ]);

    $response->assertRedirect('/admin/users');

    $this->assertDatabaseHas('users', [
        'nik' => 'SOA002',
        'name' => 'Budi Santoso',
        'role' => 'SOA',
        'store_id' => $this->store->id,
        'is_active' => true,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'action' => 'CREATE_USER',
        'performed_by_id' => $this->smUser->id,
    ]);
});

test('cannot create user with duplicate nik', function () {
    $this->actingAs($this->smUser);

    $response = $this->post('/admin/users', [
        'nik' => 'SOA001', // already exists
        'name' => 'Duplicate User',
        'role' => 'SOA',
    ]);

    $response->assertSessionHasErrors('nik');
});

test('sm can reset pin of another user', function () {
    $this->actingAs($this->smUser);

    $response = $this->post("/admin/users/{$this->soaUser->id}/reset-pin", [
        'pin' => '112233',
    ]);

    $response->assertRedirect('/admin/users');

    $this->soaUser->refresh();
    expect(Hash::check('112233', $this->soaUser->pin_hash))->toBeTrue();

    $this->assertDatabaseHas('audit_logs', [
        'action' => 'RESET_PIN',
        'performed_by_id' => $this->smUser->id,
    ]);
});

test('user cannot deactivate their own account', function () {
    $this->actingAs($this->smUser);

    $response = $this->post("/admin/users/{$this->smUser->id}/toggle-status");

    $response->assertStatus(403);
});

test('sm can toggle active status of another user', function () {
    $this->actingAs($this->smUser);

    $response = $this->post("/admin/users/{$this->soaUser->id}/toggle-status");

    $response->assertRedirect('/admin/users');

    $this->soaUser->refresh();
    expect($this->soaUser->is_active)->toBeFalse();

    $this->assertDatabaseHas('audit_logs', [
        'action' => 'DEACTIVATE_USER',
        'performed_by_id' => $this->smUser->id,
    ]);

    // Toggle back to active
    $this->post("/admin/users/{$this->soaUser->id}/toggle-status");
    $this->soaUser->refresh();
    expect($this->soaUser->is_active)->toBeTrue();
});
