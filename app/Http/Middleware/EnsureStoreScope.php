<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreScope
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->store_id) {
            $request->attributes->set('current_store_id', $user->store_id);
            $request->attributes->set('current_store', $user->store);
        }

        return $next($request);
    }
}
