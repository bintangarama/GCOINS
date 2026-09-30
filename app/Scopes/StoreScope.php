<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class StoreScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (! Auth::check()) {
            return;
        }

        $user = Auth::user();

        // SYSTEM_ADMIN can view cross-store records for read operations
        if ($user->role === 'SYSTEM_ADMIN' || (method_exists($user, 'hasRole') && $user->hasRole('SYSTEM_ADMIN'))) {
            return;
        }

        if ($user->store_id) {
            $builder->where($model->getTable().'.store_id', $user->store_id);
        }
    }
}
