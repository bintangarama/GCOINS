<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class CancelVoucherAction
{
    /**
     * Cancel voucher post-disbursement, requiring cash to be refunded.
     * Roles: SAC, SM.
     */
    public function execute(
        PettyCashVoucher $voucher,
        string $reason,
        User $actor,
        ?string $ipAddress = null
    ): PettyCashVoucher {
        if (! in_array($actor->role, ['SAC', 'SM'], true)) {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SAC dan SM yang dapat membatalkan voucher tercairkan.');
        }

        if ($voucher->status !== PettyCashVoucher::STATUS_DISBURSED) {
            throw new InvalidVoucherStateException("Voucher dengan status {$voucher->status} tidak dapat dibatalkan.");
        }

        return DB::transaction(function () use ($voucher, $reason, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
                'rejection_reason' => $voucher->rejection_reason,
            ];

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_REJECTED_REFUND_PENDING,
                'rejection_reason' => $reason,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'CANCEL_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $voucher->status,
                    'rejection_reason' => $reason,
                ],
                'ip_address' => $ipAddress,
            ]);

            return $voucher;
        });
    }
}
