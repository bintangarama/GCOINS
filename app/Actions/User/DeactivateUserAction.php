<?php

namespace App\Actions\User;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class DeactivateUserAction
{
    /**
     * Toggle or set the active status of a user.
     *
     * @throws ValidationException
     */
    public function execute(User $targetUser, ?bool $newStatus = null, ?string $ipAddress = null): User
    {
        $actor = Auth::user();

        if ($actor && $actor->id === $targetUser->id) {
            throw ValidationException::withMessages([
                'user' => __('Anda tidak dapat mengubah status akun Anda sendiri.'),
            ]);
        }

        $oldStatus = $targetUser->is_active;
        $updatedStatus = $newStatus ?? ! $oldStatus;

        $targetUser->update(['is_active' => $updatedStatus]);

        if ($actor) {
            AuditLog::create([
                'store_id' => $targetUser->store_id,
                'entity_name' => 'User',
                'entity_id' => $targetUser->id,
                'action' => $updatedStatus ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
                'performed_by_id' => $actor->id,
                'old_values' => ['is_active' => $oldStatus],
                'new_values' => ['is_active' => $updatedStatus],
                'ip_address' => $ipAddress,
            ]);
        }

        return $targetUser;
    }
}
