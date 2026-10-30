<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ReclassifyVoucherCategoryAction
{
    /**
     * Reclassify a voucher's expense category before settlement without altering financial amounts or status.
     * Allowed roles: SS, SAC, SM (same store).
     * Allowed statuses: SUBMITTED, APPROVED_SS, DISBURSED.
     */
    public function execute(
        PettyCashVoucher $voucher,
        string $newCategory,
        User $actor,
        ?string $ipAddress = null,
        ?string $reason = null
    ): PettyCashVoucher {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if (! in_array($actor->role, ['SS', 'SAC', 'SM'], true) || $actor->store_id !== $voucher->store_id) {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SS, SAC, dan SM di toko yang sama yang dapat mereklasifikasi kategori voucher.');
        }

        if (! in_array($voucher->status, [
            PettyCashVoucher::STATUS_SUBMITTED,
            PettyCashVoucher::STATUS_APPROVED_SS,
            PettyCashVoucher::STATUS_DISBURSED,
        ], true)) {
            throw new InvalidVoucherStateException("Kategori voucher berstatus {$voucher->status} sudah terkunci dan tidak dapat diubah.");
        }

        $newCategory = trim($newCategory);
        if ($newCategory === '') {
            throw new InvalidArgumentException('Kategori pengeluaran baru wajib diisi.');
        }

        if ($voucher->category === $newCategory) {
            return $voucher;
        }

        $cleanReason = $reason !== null && trim($reason) !== '' ? trim($reason) : null;

        return DB::transaction(function () use ($voucher, $newCategory, $actor, $ipAddress, $cleanReason) {
            $oldValues = [
                'category' => $voucher->category,
                'status' => $voucher->status,
            ];

            $voucher->update([
                'category' => $newCategory,
            ]);

            $newValues = [
                'category' => $voucher->category,
                'status' => $voucher->status,
            ];

            if ($cleanReason !== null) {
                $newValues['reason'] = $cleanReason;
            }

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'RECLASSIFY_CATEGORY',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => $ipAddress,
            ]);

            return $voucher;
        });
    }
}

