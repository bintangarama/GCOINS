<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Resolve validated pagination page size (strictly whitelisted to 20, 50, or 100).
     */
    protected function resolvePerPage(Request $request, int $default = 20): int
    {
        $perPage = (int) $request->query('per_page', $default);

        return in_array($perPage, [20, 50, 100], true) ? $perPage : $default;
    }
}
