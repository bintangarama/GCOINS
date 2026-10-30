<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreScope
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            Auth::logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return redirect()->route('login')->withErrors([
                'nik' => __('Akun Anda telah dinonaktifkan. Silakan hubungi admin toko.'),
            ]);
        }

        if ($user && $user->store_id) {
            $request->attributes->set('current_store_id', $user->store_id);
            $request->attributes->set('current_store', $user->store);
        }

        return $next($request);
    }
}
