<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\LoginAction;
use App\Actions\Auth\LogoutAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle incoming authentication request.
     */
    public function store(LoginRequest $request, LoginAction $loginAction): RedirectResponse
    {
        $loginAction->execute(
            nik: $request->validated('nik'),
            pin: $request->validated('pin'),
            remember: (bool) $request->validated('remember', false),
            request: $request
        );

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request, LogoutAction $logoutAction): RedirectResponse
    {
        $logoutAction->execute($request);

        return redirect()->route('login');
    }
}
