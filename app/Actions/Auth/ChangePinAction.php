<?php

namespace App\Actions\Auth;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ChangePinAction
{
    /**
     * Change a user's PIN.
     *
     * @throws ValidationException
     */
    public function execute(User $user, string $currentPin, string $newPin, ?string $ipAddress = null): void
    {
        if (! Hash::check($currentPin, $user->pin_hash)) {
            throw ValidationException::withMessages([
                'current_pin' => __('PIN lama tidak sesuai.'),
            ]);
        }

        $user->update([
            'pin_hash' => Hash::make($newPin),
        ]);

        AuditLog::create([
            'store_id' => $user->store_id,
            'entity_name' => 'User',
            'entity_id' => $user->id,
            'action' => 'CHANGE_PIN',
            'performed_by_id' => $user->id,
            'old_values' => null,
            'new_values' => ['nik' => $user->nik],
            'ip_address' => $ipAddress,
        ]);
    }
}
