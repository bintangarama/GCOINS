<?php

namespace App\Policies;

use App\Models\BriFundPosting;
use App\Models\User;

class BriFundPostingPolicy
{
    /**
     * Determine whether the user can view any BRI fund postings.
     * Roles: SAC, SS, SM, SYSTEM_ADMIN.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['SAC', 'SS', 'SM', 'SYSTEM_ADMIN'], true);
    }

    /**
     * Determine whether the user can view the specific posting.
     */
    public function view(User $user, BriFundPosting $posting): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        if ($user->store_id !== $posting->store_id) {
            return false;
        }

        return in_array($user->role, ['SAC', 'SS', 'SM'], true);
    }

    /**
     * Determine whether the user can record a posting (INFLOW or OUTFLOW).
     * Roles: SAC, SS.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['SAC', 'SS'], true);
    }

    /**
     * Determine whether the user can approve the outflow posting.
     * Roles: SS, SM.
     * Enforces Dual Control: creator cannot approve their own outflow.
     */
    public function approve(User $user, BriFundPosting $posting): bool
    {
        if ($posting->status !== BriFundPosting::STATUS_PENDING_SS || $posting->type !== BriFundPosting::TYPE_OUTFLOW) {
            return false;
        }

        if ($user->store_id !== $posting->store_id) {
            return false;
        }

        // Must be SS or SM
        if (! in_array($user->role, ['SS', 'SM'], true)) {
            return false;
        }

        // Rule 6: Dual Control (creator != approver)
        if ($user->id === $posting->created_by_id) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can reject the outflow posting.
     * Roles: SS, SM.
     */
    public function reject(User $user, BriFundPosting $posting): bool
    {
        if ($posting->status !== BriFundPosting::STATUS_PENDING_SS || $posting->type !== BriFundPosting::TYPE_OUTFLOW) {
            return false;
        }

        if ($user->store_id !== $posting->store_id) {
            return false;
        }

        return in_array($user->role, ['SS', 'SM'], true);
    }

    /**
     * Determine whether the user can export BRI fund postings summary (.xlsx).
     * Roles: SAC, SS, SM, SYSTEM_ADMIN (FR-RPT-04, docs/04-users-and-roles.md).
     */
    public function export(User $user): bool
    {
        return in_array($user->role, ['SAC', 'SS', 'SM', 'SYSTEM_ADMIN'], true);
    }
}
