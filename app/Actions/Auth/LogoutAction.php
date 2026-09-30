<?php

namespace App\Actions\Auth;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogoutAction
{
    /**
     * Log the user out and invalidate the session.
     */
    public function execute(Request $request): void
    {
        $user = $request->user();

        if ($user) {
            AuditLog::create([
                'store_id' => $user->store_id,
                'entity_name' => 'User',
                'entity_id' => $user->id,
                'action' => 'LOGOUT',
                'performed_by_id' => $user->id,
                'old_values' => null,
                'new_values' => [
                    'nik' => $user->nik,
                    'role' => $user->role,
                ],
                'ip_address' => $request->ip(),
            ]);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
