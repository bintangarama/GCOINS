<?php

namespace App\Actions\Notification;

use App\Models\Notification;
use App\Models\User;

class SendNotificationAction
{
    /**
     * Send in-app notification to a specific user.
     */
    public function toUser(
        User $user,
        string $type,
        string $title,
        string $message,
        ?string $entityType = null,
        ?string $entityId = null
    ): Notification {
        return Notification::create([
            'store_id' => $user->store_id,
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'read_at' => null,
            'created_at' => now(),
        ]);
    }

    /**
     * Send notification to all active users with specified roles in a store.
     *
     * @param  array<string>  $roles
     */
    public function toStoreRoles(
        string $storeId,
        array $roles,
        string $type,
        string $title,
        string $message,
        ?string $entityType = null,
        ?string $entityId = null,
        ?string $excludeUserId = null
    ): void {
        $users = User::where('store_id', $storeId)
            ->where('is_active', true)
            ->whereIn('role', $roles)
            ->when($excludeUserId, fn ($q) => $q->where('id', '!=', $excludeUserId))
            ->get();

        foreach ($users as $user) {
            $this->toUser($user, $type, $title, $message, $entityType, $entityId);
        }
    }
}
