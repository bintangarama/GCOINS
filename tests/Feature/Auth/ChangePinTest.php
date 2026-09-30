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

test('profile page can be rendered for authenticated user', function () {
    $response = $this->actingAs($this->user)->get('/profile');

    $response->assertStatus(200);
});

test('T-AUTH-05: change PIN requires valid current PIN', function () {
    $response = $this->actingAs($this->user)->put('/profile/pin', [
        'current_pin' => 'wrongpin',
        'new_pin' => '654321',
        'new_pin_confirmation' => '654321',
    ]);

    $response->assertSessionHasErrors('current_pin');
    expect(Hash::check('123456', $this->user->fresh()->pin_hash))->toBeTrue();
});

test('user can successfully change PIN with valid inputs', function () {
    $response = $this->actingAs($this->user)->put('/profile/pin', [
        'current_pin' => '123456',
        'new_pin' => '654321',
        'new_pin_confirmation' => '654321',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $freshUser = $this->user->fresh();
    expect(Hash::check('654321', $freshUser->pin_hash))->toBeTrue();

    // Verify audit log
    $this->assertDatabaseHas('audit_logs', [
        'action' => 'CHANGE_PIN',
        'performed_by_id' => $this->user->id,
        'entity_name' => 'User',
    ]);
});

test('change PIN fails when new PIN is less than 6 characters', function () {
    $response = $this->actingAs($this->user)->put('/profile/pin', [
        'current_pin' => '123456',
        'new_pin' => '12345',
        'new_pin_confirmation' => '12345',
    ]);

    $response->assertSessionHasErrors('new_pin');
});

test('change PIN fails when confirmation does not match', function () {
    $response = $this->actingAs($this->user)->put('/profile/pin', [
        'current_pin' => '123456',
        'new_pin' => '654321',
        'new_pin_confirmation' => '999999',
    ]);

    $response->assertSessionHasErrors('new_pin');
});
