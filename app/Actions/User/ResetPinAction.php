<?php

namespace App\Actions\User;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class ResetPinAction
{
    /**
     * Reset a user's PIN.
     */
    public function execute(User $targetUser, string $newPin = '123456', ?string $ipAddress = null): void
    {
        $actor = Auth::user();

        $targetUser->update([
            'pin_hash' => Hash::make($newPin),
        ]);

        if ($actor) {
            AuditLog::create([
                'store_id' => $targetUser->store_id,
                'entity_name' => 'User',
                'entity_id' => $targetUser->id,
                'action' => 'RESET_PIN',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => ['nik' => $targetUser->nik, 'reset_by' => $actor->nik],
                'ip_address' => $ipAddress,
            ]);
        }
    }
}
