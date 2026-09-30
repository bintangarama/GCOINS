<?php

namespace App\Actions\Notification;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class MarkNotificationAsReadAction
{
    /**
     * Mark a single notification as read.
     *
     * @throws AuthorizationException
     */
    public function execute(Notification $notification, User $user): Notification
    {
        if ($notification->user_id !== $user->id) {
            throw new AuthorizationException(__('Anda tidak berhak mengakses notifikasi ini.'));
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return $notification;
    }
}
