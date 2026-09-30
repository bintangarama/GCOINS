<?php

namespace App\Policies;

use App\Models\PettyCashVoucher;
use App\Models\User;

class PettyCashVoucherPolicy
{
    /**
     * Determine whether the user can view any vouchers.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['SOA', 'SS', 'SAC', 'SM', 'SYSTEM_ADMIN'], true);
    }

    /**
     * Determine whether the user can view the specific voucher.
     */
    public function view(User $user, PettyCashVoucher $voucher): bool
    {
        if ($user->role === 'SYSTEM_ADMIN') {
            return true;
        }

        return $user->store_id === $voucher->store_id;
    }

    /**
     * Determine whether the user can create vouchers.
     * Roles: SOA, SS, SAC. (SM and SYSTEM_ADMIN cannot create vouchers).
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['SOA', 'SS', 'SAC'], true);
    }

    /**
     * Determine whether the user can update the voucher (only DRAFT by owner).
     */
    public function update(User $user, PettyCashVoucher $voucher): bool
    {
        return $voucher->status === PettyCashVoucher::STATUS_DRAFT
            && $voucher->requester_id === $user->id;
    }

    /**
     * Determine whether the user can delete the voucher (only DRAFT by owner).
     */
    public function delete(User $user, PettyCashVoucher $voucher): bool
    {
        if ($voucher->status !== PettyCashVoucher::STATUS_DRAFT) {
            return false;
        }

        return $voucher->requester_id === $user->id || $user->role === 'SYSTEM_ADMIN';
    }

    /**
     * Determine whether the user can submit the voucher.
     */
    public function submit(User $user, PettyCashVoucher $voucher): bool
    {
        return $voucher->status === PettyCashVoucher::STATUS_DRAFT
            && $voucher->requester_id === $user->id;
    }

    /**
     * Determine whether the user can approve the voucher.
     * Roles: SS, SAC, SM.
     * Anti Self-Approval: SAC cannot approve their own voucher!
     */
    public function approve(User $user, PettyCashVoucher $voucher): bool
    {
        if ($user->role === 'SAC' && $voucher->requester_id === $user->id) {
            return false;
        }

        if (! in_array($user->role, ['SS', 'SAC', 'SM'], true)) {
            return false;
        }

        if ($user->role !== 'SYSTEM_ADMIN' && $user->store_id !== $voucher->store_id) {
            return false;
        }

        return $voucher->status === PettyCashVoucher::STATUS_SUBMITTED;
    }

    /**
     * Determine whether the user can reject the voucher.
     */
    public function reject(User $user, PettyCashVoucher $voucher): bool
    {
        if ($user->role === 'SAC' && $voucher->requester_id === $user->id) {
            return false;
        }

        if (! in_array($user->role, ['SS', 'SAC', 'SM'], true)) {
            return false;
        }

        if ($user->role !== 'SYSTEM_ADMIN' && $user->store_id !== $voucher->store_id) {
            return false;
        }

        return in_array($voucher->status, [PettyCashVoucher::STATUS_SUBMITTED, PettyCashVoucher::STATUS_APPROVED_SS], true);
    }

    /**
     * Determine whether the user can disburse cash for the voucher (SAC only).
     */
    public function disburse(User $user, PettyCashVoucher $voucher): bool
    {
        if ($user->role !== 'SAC') {
            return false;
        }

        if ($user->store_id !== $voucher->store_id) {
            return false;
        }

        return $voucher->status === PettyCashVoucher::STATUS_APPROVED_SS;
    }

    /**
     * Determine whether the user can settle the voucher (SAC only).
     */
    public function settle(User $user, PettyCashVoucher $voucher): bool
    {
        if ($user->role !== 'SAC') {
            return false;
        }

        if ($user->store_id !== $voucher->store_id) {
            return false;
        }

        return $voucher->status === PettyCashVoucher::STATUS_DISBURSED;
    }

    /**
     * Determine whether the user can cancel the voucher post-disbursement (SAC, SM).
     */
    public function cancel(User $user, PettyCashVoucher $voucher): bool
    {
        if (! in_array($user->role, ['SAC', 'SM'], true)) {
            return false;
        }

        if ($user->role !== 'SYSTEM_ADMIN' && $user->store_id !== $voucher->store_id) {
            return false;
        }

        return $voucher->status === PettyCashVoucher::STATUS_DISBURSED;
    }

    /**
     * Determine whether the user can confirm refund (SAC only).
     */
    public function refund(User $user, PettyCashVoucher $voucher): bool
    {
        if ($user->role !== 'SAC') {
            return false;
        }

        if ($user->store_id !== $voucher->store_id) {
            return false;
        }

        return $voucher->status === PettyCashVoucher::STATUS_REJECTED_REFUND_PENDING;
    }

    /**
     * Determine whether the user can export voucher recap (.xlsx).
     * Roles: SAC, SS, SM, SYSTEM_ADMIN (FR-RPT-03, docs/04-users-and-roles.md).
     */
    public function export(User $user): bool
    {
        return in_array($user->role, ['SAC', 'SS', 'SM', 'SYSTEM_ADMIN'], true);
    }
}
