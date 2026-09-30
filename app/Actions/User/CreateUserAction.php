<?php

namespace App\Actions\User;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class CreateUserAction
{
    /**
     * Create a new user and assign role.
     *
     * @param  array{nik: string, name: string, role: string, store_id?: string|null, phone_number?: string|null, pin?: string|null}  $data
     */
    public function execute(array $data, ?string $ipAddress = null): User
    {
        $actor = Auth::user();
        $storeId = $data['store_id'] ?? ($actor?->role === 'SYSTEM_ADMIN' ? null : $actor?->store_id);
        $pin = $data['pin'] ?? '123456';

        $user = User::create([
            'store_id' => $storeId,
            'nik' => $data['nik'],
            'name' => $data['name'],
            'role' => $data['role'],
            'pin_hash' => Hash::make($pin),
            'phone_number' => $data['phone_number'] ?? null,
            'is_active' => true,
        ]);

        $user->syncRoles([$data['role']]);

        if ($actor) {
            AuditLog::create([
                'store_id' => $storeId,
                'entity_name' => 'User',
                'entity_id' => $user->id,
                'action' => 'CREATE_USER',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => [
                    'nik' => $user->nik,
                    'name' => $user->name,
                    'role' => $user->role,
                    'store_id' => $storeId,
                ],
                'ip_address' => $ipAddress,
            ]);
        }

        return $user;
    }
}
