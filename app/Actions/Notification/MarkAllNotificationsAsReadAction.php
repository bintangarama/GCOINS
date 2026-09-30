<?php

namespace App\Actions\Notification;

use App\Models\Notification;
use App\Models\User;

class MarkAllNotificationsAsReadAction
{
    /**
     * Mark all unread notifications for a user as read.
     */
    public function execute(User $user): int
    {
        return Notification::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
