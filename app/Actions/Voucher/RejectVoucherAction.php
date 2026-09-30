<?php

namespace App\Actions\Voucher;

use App\Actions\Notification\SendNotificationAction;
use App\Exceptions\ForbiddenSelfApprovalException;
use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RejectVoucherAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Reject a submitted or approved (prior to disbursement) voucher.
     * Rejection reason is mandatory.
     */
    public function execute(
        PettyCashVoucher $voucher,
        string $reason,
        User $actor,
        ?string $ipAddress = null
    ): PettyCashVoucher {
        $reason = trim($reason);
        if (empty($reason)) {
            throw new InvalidArgumentException('Alasan penolakan wajib diisi.');
        }

        // SAC cannot review their own voucher
        if ($actor->role === 'SAC' && $voucher->requester_id === $actor->id) {
            throw new ForbiddenSelfApprovalException('FORBIDDEN_SELF_APPROVAL: Anda tidak dapat memproses penolakan pengajuan milik sendiri.');
        }

        // Rule 9: Valid State Transitions Only (SUBMITTED or APPROVED_SS -> REJECTED)
        if (! in_array($voucher->status, [PettyCashVoucher::STATUS_SUBMITTED, PettyCashVoucher::STATUS_APPROVED_SS], true)) {
            throw new InvalidVoucherStateException("Voucher dengan status {$voucher->status} tidak dapat ditolak.");
        }

        return DB::transaction(function () use ($voucher, $reason, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
                'rejection_reason' => $voucher->rejection_reason,
            ];

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_REJECTED,
                'rejection_reason' => $reason,
                'approved_by_id' => $actor->id,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'REJECT_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $voucher->status,
                    'rejection_reason' => $reason,
                ],
                'ip_address' => $ipAddress,
            ]);

            if ($voucher->requester) {
                $this->notificationAction->toUser(
                    $voucher->requester,
                    'VOUCHER_REJECTED',
                    'Voucher Ditolak',
                    "Voucher {$voucher->voucher_number} ditolak oleh {$actor->name}. Alasan: {$reason}",
                    'VOUCHER',
                    $voucher->id
                );
            }

            return $voucher;
        });
    }
}
