<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'], true);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'], true);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return in_array($user->role, ['SAC', 'SM'], true) && $user->store_id === $model->store_id;
    }

    /**
     * Determine whether the user can reset the model's PIN.
     */
    public function resetPin(User $user, User $model): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return in_array($user->role, ['SAC', 'SM'], true) && $user->store_id === $model->store_id;
    }

    /**
     * Determine whether the user can toggle the active status of the model.
     */
    public function toggleStatus(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return false;
        }

        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return in_array($user->role, ['SAC', 'SM'], true) && $user->store_id === $model->store_id;
    }
}
