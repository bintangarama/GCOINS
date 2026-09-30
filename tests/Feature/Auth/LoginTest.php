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

    $this->user = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'Staff Admin Clerk',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->user->syncRoles(['SAC']);
});

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('user can authenticate using valid nik and pin', function () {
    $response = $this->post('/login', [
        'nik' => 'SAC001',
        'pin' => '123456',
    ]);

    $this->assertAuthenticatedAs($this->user);
    $response->assertRedirect('/dashboard');

    $this->assertDatabaseHas('audit_logs', [
        'action' => 'LOGIN',
        'performed_by_id' => $this->user->id,
        'entity_name' => 'User',
    ]);
});

test('user cannot authenticate with invalid pin', function () {
    $response = $this->post('/login', [
        'nik' => 'SAC001',
        'pin' => '999999',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors('nik');
});

test('inactive user cannot authenticate', function () {
    $this->user->update(['is_active' => false]);

    $response = $this->post('/login', [
        'nik' => 'SAC001',
        'pin' => '123456',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors('nik');
});

test('authenticated user can logout', function () {
    $this->actingAs($this->user);

    $response = $this->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/login');

    $this->assertDatabaseHas('audit_logs', [
        'action' => 'LOGOUT',
        'performed_by_id' => $this->user->id,
    ]);
});

test('unauthenticated user cannot access dashboard', function () {
    $response = $this->get('/dashboard');

    $response->assertRedirect('/login');
});

test('login attempts are rate limited after 5 failed attempts', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'nik' => 'SAC001',
            'pin' => 'wrong',
        ]);
    }

    $response = $this->post('/login', [
        'nik' => 'SAC001',
        'pin' => 'wrong',
    ]);

    $response->assertStatus(429);
});

