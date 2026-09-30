<?php

namespace App\Http\Controllers;

use App\Actions\Auth\ChangePinAction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user profile page.
     */
    public function show(Request $request): Response
    {
        $user = $request->user()->loadMissing('store');

        return Inertia::render('Profile/Index', [
            'user' => $user,
        ]);
    }

    /**
     * Update user's PIN.
     */
    public function updatePin(Request $request, ChangePinAction $changePinAction): RedirectResponse
    {
        $validated = $request->validate([
            'current_pin' => ['required', 'string'],
            'new_pin' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'current_pin.required' => __('PIN saat ini wajib diisi.'),
            'new_pin.required' => __('PIN baru wajib diisi.'),
            'new_pin.min' => __('PIN baru minimal harus 6 karakter/digit.'),
            'new_pin.confirmed' => __('Konfirmasi PIN baru tidak sesuai.'),
        ]);

        $changePinAction->execute(
            user: $request->user(),
            currentPin: $validated['current_pin'],
            newPin: $validated['new_pin'],
            ipAddress: $request->ip()
        );

        return back()->with('success', __('PIN berhasil diperbarui.'));
    }
}
