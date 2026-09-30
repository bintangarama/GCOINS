<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class RefundVoucherAction
{
    /**
     * Confirm cash refund returned to cashier (SAC only).
     */
    public function execute(PettyCashVoucher $voucher, User $actor, ?string $ipAddress = null): PettyCashVoucher
    {
        if ($actor->role !== 'SAC') {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SAC yang berwenang mengonfirmasi pengembalian dana.');
        }

        if ($voucher->status !== PettyCashVoucher::STATUS_REJECTED_REFUND_PENDING) {
            throw new InvalidVoucherStateException("Voucher dengan status {$voucher->status} tidak sedang menunggu pengembalian dana.");
        }

        return DB::transaction(function () use ($voucher, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
            ];

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_REFUNDED,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'REFUND_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $voucher->status,
                ],
                'ip_address' => $ipAddress,
            ]);

            return $voucher;
        });
    }
}
