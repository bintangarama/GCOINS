<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RecallVoucherAction
{
    /**
     * Recall (withdraw) a SUBMITTED voucher back to DRAFT so the requester can revise or cancel it.
     * Only permitted while status is still SUBMITTED (prior to any approval or rejection).
     */
    public function execute(
        PettyCashVoucher $voucher,
        User $actor,
        ?string $ipAddress = null
    ): PettyCashVoucher {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if ($voucher->status !== PettyCashVoucher::STATUS_SUBMITTED) {
            throw new InvalidVoucherStateException("Hanya voucher berstatus SUBMITTED yang dapat ditarik kembali ke draft (status saat ini: {$voucher->status}).");
        }

        if ($voucher->requester_id !== $actor->id || $voucher->store_id !== $actor->store_id) {
            throw new AuthorizationException('Hanya pembuat bon yang dapat menarik kembali pengajuan ini ke draft.');
        }

        return DB::transaction(function () use ($voucher, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
            ];

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_DRAFT,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'RECALL_VOUCHER',
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

