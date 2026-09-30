<?php

use App\Actions\Notification\SendNotificationAction;
use App\Models\Notification;
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

    $this->sac = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'Staff Admin Clerk',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sac->syncRoles(['SAC']);

    $this->ss = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'Store Supervisor',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ss->syncRoles(['SS']);

    $this->soa = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SOA001',
        'name' => 'Store Officer Associate',
        'role' => 'SOA',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->soa->syncRoles(['SOA']);
});

test('user can view their notifications page', function () {
    Notification::create([
        'store_id' => $this->store->id,
        'user_id' => $this->sac->id,
        'type' => 'VOUCHER_SUBMITTED',
        'title' => 'Pengajuan Voucher Baru',
        'message' => 'Ada voucher baru diajukan',
        'read_at' => null,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->sac)->get('/notifications');

    $response->assertStatus(200);
});

test('T-NTF-01: notification created on voucher submit', function () {
    $action = app(SendNotificationAction::class);
    $action->toStoreRoles(
        storeId: $this->store->id,
        roles: ['SS', 'SAC'],
        type: 'VOUCHER_SUBMITTED',
        title: 'Pengajuan Voucher',
        message: 'Voucher baru diajukan',
        entityType: 'VOUCHER',
        entityId: 'vch-123'
    );

    $this->assertDatabaseHas('notifications', [
        'user_id' => $this->ss->id,
        'type' => 'VOUCHER_SUBMITTED',
        'entity_id' => 'vch-123',
    ]);
    $this->assertDatabaseHas('notifications', [
        'user_id' => $this->sac->id,
        'type' => 'VOUCHER_SUBMITTED',
        'entity_id' => 'vch-123',
    ]);
});

test('T-NTF-02: notification created on opname submit', function () {
    $action = app(SendNotificationAction::class);
    $action->toStoreRoles(
        storeId: $this->store->id,
        roles: ['SS'],
        type: 'OPNAME_SUBMITTED',
        title: 'Cash Opname Diajukan',
        message: 'Sesi cash opname menunggu verifikasi',
        entityType: 'CASH_OPNAME_SESSION',
        entityId: 'opn-123'
    );

    $this->assertDatabaseHas('notifications', [
        'user_id' => $this->ss->id,
        'type' => 'OPNAME_SUBMITTED',
        'entity_id' => 'opn-123',
    ]);
});

test('user can mark single notification as read', function () {
    $notification = Notification::create([
        'store_id' => $this->store->id,
        'user_id' => $this->sac->id,
        'type' => 'INFO',
        'title' => 'Pemberitahuan',
        'message' => 'Test message',
        'read_at' => null,
        'created_at' => now(),
    ]);

    expect($notification->read_at)->toBeNull();

    $response = $this->actingAs($this->sac)->post("/notifications/{$notification->id}/read");

    $response->assertRedirect();
    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('user can mark all notifications as read', function () {
    Notification::create([
        'store_id' => $this->store->id,
        'user_id' => $this->sac->id,
        'type' => 'INFO',
        'title' => 'Pemberitahuan 1',
        'message' => 'Test 1',
        'read_at' => null,
        'created_at' => now(),
    ]);

    Notification::create([
        'store_id' => $this->store->id,
        'user_id' => $this->sac->id,
        'type' => 'INFO',
        'title' => 'Pemberitahuan 2',
        'message' => 'Test 2',
        'read_at' => null,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->sac)->post('/notifications/read-all');

    $response->assertRedirect();

    $unreadCount = Notification::where('user_id', $this->sac->id)->whereNull('read_at')->count();
    expect($unreadCount)->toBe(0);
});

test('user can delete their own notification', function () {
    $notification = Notification::create([
        'store_id' => $this->store->id,
        'user_id' => $this->sac->id,
        'type' => 'INFO',
        'title' => 'Hapus Saya',
        'message' => 'Test',
        'read_at' => null,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->sac)->delete("/notifications/{$notification->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
});

test('user cannot delete another users notification', function () {
    $notification = Notification::create([
        'store_id' => $this->store->id,
        'user_id' => $this->ss->id,
        'type' => 'INFO',
        'title' => 'Milik SS',
        'message' => 'Test',
        'read_at' => null,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->sac)->delete("/notifications/{$notification->id}");

    $response->assertStatus(403);
    $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
});
