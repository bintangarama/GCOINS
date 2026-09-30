<?php

namespace App\Actions\Auth;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginAction
{
    /**
     * Authenticate the user with NIK and PIN.
     *
     * @throws ValidationException
     */
    public function execute(string $nik, string $pin, bool $remember = false, ?Request $request = null): User
    {
        $user = User::where('nik', $nik)->first();

        if (! $user || ! Hash::check($pin, $user->pin_hash)) {
            throw ValidationException::withMessages([
                'nik' => __('NIK atau PIN yang Anda masukkan salah.'),
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'nik' => __('Akun ini sedang dinonaktifkan. Silakan hubungi admin toko.'),
            ]);
        }

        Auth::login($user, $remember);

        if ($request) {
            $request->session()->regenerate();
        }

        // Record audit log
        AuditLog::create([
            'store_id' => $user->store_id,
            'entity_name' => 'User',
            'entity_id' => $user->id,
            'action' => 'LOGIN',
            'performed_by_id' => $user->id,
            'old_values' => null,
            'new_values' => [
                'nik' => $user->nik,
                'role' => $user->role,
                'store_id' => $user->store_id,
            ],
            'ip_address' => $request?->ip(),
        ]);

        return $user;
    }
}
