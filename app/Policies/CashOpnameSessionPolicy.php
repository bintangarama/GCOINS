<?php

namespace App\Policies;

use App\Models\CashOpnameSession;
use App\Models\User;

class CashOpnameSessionPolicy
{
    /**
     * Determine whether the user can view any opname sessions.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['SOA', 'SS', 'SAC', 'SM', 'SYSTEM_ADMIN'], true);
    }

    /**
     * Determine whether the user can view the specific session.
     */
    public function view(User $user, CashOpnameSession $session): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can open/create an opname session.
     * Role: SAC only (FR-OPN-01, T-RBAC-01).
     */
    public function create(User $user): bool
    {
        return $user->role === 'SAC';
    }

    /**
     * Determine whether the user can update denomination counts.
     * Role: SAC only, during DRAFT (FR-OPN-02).
     */
    public function updateDenominations(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_DRAFT) {
            return false;
        }

        return $user->role === 'SAC' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can update BRI sub-ledger.
     * Role: SAC only, during DRAFT (FR-OPN-03).
     */
    public function updateBriSubledger(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_DRAFT) {
            return false;
        }

        return $user->role === 'SAC' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can submit the session to SS.
     * Role: SAC only, during DRAFT (FR-OPN-05).
     */
    public function submit(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_DRAFT) {
            return false;
        }

        return $user->role === 'SAC' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can verify the session.
     * Role: SS only, when SUBMITTED (FR-OPN-06).
     */
    public function verify(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_SUBMITTED) {
            return false;
        }

        return $user->role === 'SS' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can sign-off (approve) the session.
     * Role: SM only, when VERIFIED_SS (FR-OPN-07, T-RBAC-03).
     */
    public function signOff(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_VERIFIED_SS) {
            return false;
        }

        return $user->role === 'SM' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether SS can reject the session back to DRAFT.
     */
    public function rejectSs(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_SUBMITTED) {
            return false;
        }

        return $user->role === 'SS' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether SM can reject the session back to DRAFT.
     */
    public function rejectSm(User $user, CashOpnameSession $session): bool
    {
        if ($session->status !== CashOpnameSession::STATUS_VERIFIED_SS) {
            return false;
        }

        return $user->role === 'SM' && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can download BACO Excel export (.xlsx).
     * Roles: SAC, SS, SM, SYSTEM_ADMIN (FR-RPT-01, docs/04-users-and-roles.md).
     */
    public function exportExcel(User $user, CashOpnameSession $session): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return in_array($user->role, ['SAC', 'SS', 'SM'], true) && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can view print-friendly report (HTML).
     * Roles: SAC, SS, SM, SYSTEM_ADMIN (FR-RPT-02, docs/04-users-and-roles.md).
     */
    public function viewReport(User $user, CashOpnameSession $session): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return in_array($user->role, ['SAC', 'SS', 'SM'], true) && $user->store_id === $session->store_id;
    }

    /**
     * Determine whether the user can upload signed BA scan.
     * Roles: SAC, SM, SYSTEM_ADMIN (FR-RPT-05).
     */
    public function uploadSignedBa(User $user, CashOpnameSession $session): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return in_array($user->role, ['SAC', 'SM'], true) && $user->store_id === $session->store_id;
    }
}
