<?php

namespace App\Actions\Voucher;

use App\Actions\Notification\SendNotificationAction;
use App\Exceptions\ForbiddenSelfApprovalException;
use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ApproveVoucherAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Approve a submitted voucher.
     * Enforces Anti Self-Approval invariant: SAC cannot approve their own voucher.
     */
    public function execute(PettyCashVoucher $voucher, User $actor, ?string $ipAddress = null): PettyCashVoucher
    {
        // Rule 5: Anti Self-Approval
        if ($actor->role === 'SAC' && $voucher->requester_id === $actor->id) {
            throw new ForbiddenSelfApprovalException('FORBIDDEN_SELF_APPROVAL: Anda tidak dapat menyetujui pengajuan milik sendiri.');
        }

        // Rule 9: Valid State Transitions Only
        if ($voucher->status !== PettyCashVoucher::STATUS_SUBMITTED) {
            throw new InvalidVoucherStateException("Voucher dengan status {$voucher->status} tidak dapat disetujui.");
        }

        return DB::transaction(function () use ($voucher, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
                'approved_by_id' => $voucher->approved_by_id,
                'approved_at' => $voucher->approved_at?->toISOString(),
            ];

            $approvedAt = now();

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_APPROVED_SS,
                'approved_by_id' => $actor->id,
                'approved_at' => $approvedAt,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'APPROVE_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $voucher->status,
                    'approved_by_id' => $actor->id,
                    'approved_at' => $approvedAt->toISOString(),
                ],
                'ip_address' => $ipAddress,
            ]);

            // Notify SAC for disbursement
            $this->notificationAction->toStoreRoles(
                $voucher->store_id,
                ['SAC'],
                'VOUCHER_APPROVED',
                'Voucher Disetujui',
                "Voucher {$voucher->voucher_number} telah disetujui oleh {$actor->name} dan siap dicairkan.",
                'VOUCHER',
                $voucher->id
            );

            return $voucher;
        });
    }
}
