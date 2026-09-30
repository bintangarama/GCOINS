<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class DeleteVoucherAction
{
    /**
     * Soft delete a draft voucher (owner only).
     */
    public function execute(PettyCashVoucher $voucher, User $actor, ?string $ipAddress = null): void
    {
        if ($voucher->requester_id !== $actor->id && $actor->role !== 'SYSTEM_ADMIN') {
            throw new AuthorizationException('Anda hanya dapat menghapus voucher draft milik sendiri.');
        }

        if ($voucher->status !== PettyCashVoucher::STATUS_DRAFT) {
            throw new InvalidVoucherStateException('Hanya voucher berstatus DRAFT yang dapat dihapus.');
        }

        DB::transaction(function () use ($voucher, $actor, $ipAddress) {
            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'DELETE_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => [
                    'voucher_number' => $voucher->voucher_number,
                    'status' => $voucher->status,
                    'amount_cents' => $voucher->amount_cents,
                ],
                'new_values' => [
                    'deleted_at' => now()->toISOString(),
                ],
                'ip_address' => $ipAddress,
            ]);

            $voucher->delete();
        });
    }
}
