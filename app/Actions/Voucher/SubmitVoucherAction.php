<?php

namespace App\Actions\Voucher;

use App\Actions\Notification\SendNotificationAction;
use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SubmitVoucherAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Submit a draft voucher for review.
     */
    public function execute(PettyCashVoucher $voucher, User $actor, ?string $ipAddress = null): PettyCashVoucher
    {
        if ($voucher->status !== PettyCashVoucher::STATUS_DRAFT) {
            throw new InvalidVoucherStateException("Voucher dengan status {$voucher->status} tidak dapat diajukan.");
        }

        if (empty($voucher->receipt_image_url)) {
            throw new InvalidArgumentException('Foto kuitansi/bukti wajib dilampirkan sebelum pengajuan.');
        }

        return DB::transaction(function () use ($voucher, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
            ];

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_SUBMITTED,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'SUBMIT_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $voucher->status,
                ],
                'ip_address' => $ipAddress,
            ]);

            $this->notificationAction->toStoreRoles(
                $voucher->store_id,
                ['SS', 'SAC'],
                'VOUCHER_SUBMITTED',
                'Pengajuan Voucher Baru',
                "Voucher {$voucher->voucher_number} diajukan oleh {$actor->name}.",
                'VOUCHER',
                $voucher->id,
                $actor->id
            );

            return $voucher;
        });
    }
}
