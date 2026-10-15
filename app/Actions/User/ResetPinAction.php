<?php

namespace App\Actions\User;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ResetPinAction
{
    /**
     * Reset a user's PIN.
     */
    public function execute(User $targetUser, string $newPin = '123456', ?string $ipAddress = null): void
    {
        if (strlen($newPin) < 6) {
            throw new \InvalidArgumentException('PIN minimal 6 digit.');
        }

        $actor = Auth::user();

        $updateData = [
            'pin_hash' => Hash::make($newPin),
        ];

        if (Schema::hasColumn('users', 'must_change_pin')) {
            $updateData['must_change_pin'] = true;
        }

        $targetUser->update($updateData);

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
