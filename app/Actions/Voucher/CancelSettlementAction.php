<?php

namespace App\Actions\Voucher;

use App\Models\AuditLog;
use App\Models\PettyCashSettlement;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CancelSettlementAction
{
    /**
     * Cancel / undo a petty cash settlement recap.
     * Reverts all bound vouchers back to DISBURSED, clears settlement_id and settled_at,
     * writes comprehensive audit logs, and deletes the settlement document.
     *
     * @return Collection<int, PettyCashVoucher>
     */
    public function execute(
        PettyCashSettlement $settlement,
        User $actor,
        string $reason,
        ?string $ipAddress = null
    ): Collection {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if (! in_array($actor->role, ['SAC', 'SM', 'SYSTEM_ADMIN'], true)) {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SAC, SM, atau SYSTEM_ADMIN yang berwenang membatalkan rekapitulasi kas kecil.');
        }

        if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $settlement->store_id) {
            throw new AuthorizationException('FORBIDDEN_STORE: Anda tidak berwenang membatalkan rekapitulasi dari toko lain.');
        }

        $trimmedReason = trim($reason);
        if ($trimmedReason === '' || mb_strlen($trimmedReason) < 5) {
            throw new InvalidArgumentException('Alasan pembatalan rekapitulasi wajib diisi minimal 5 karakter.');
        }

        return DB::transaction(function () use ($settlement, $actor, $trimmedReason, $ipAddress) {
            // Lock settlement and vouchers
            $vouchers = PettyCashVoucher::where('settlement_id', $settlement->id)
                ->lockForUpdate()
                ->get();

            $settlementNumber = $settlement->settlement_number;
            $settlementTotalCents = $settlement->total_amount_cents;
            $voucherCount = $vouchers->count();
            $voucherIds = $vouchers->pluck('id')->all();

            $revertedVouchers = collect();

            foreach ($vouchers as $voucher) {
                $oldValues = [
                    'status' => $voucher->status,
                    'settled_at' => $voucher->settled_at?->toISOString(),
                    'settlement_id' => $voucher->settlement_id,
                ];

                $voucher->update([
                    'settlement_id' => null,
                    'status' => PettyCashVoucher::STATUS_DISBURSED,
                    'settled_at' => null,
                ]);

                AuditLog::create([
                    'store_id' => $voucher->store_id,
                    'entity_name' => 'PettyCashVoucher',
                    'entity_id' => $voucher->id,
                    'action' => 'UNSETTLE_VOUCHER',
                    'performed_by_id' => $actor->id,
                    'old_values' => $oldValues,
                    'new_values' => [
                        'status' => PettyCashVoucher::STATUS_DISBURSED,
                        'settled_at' => null,
                        'settlement_id' => null,
                        'cancelled_settlement_number' => $settlementNumber,
                        'reason' => $trimmedReason,
                    ],
                    'ip_address' => $ipAddress,
                ]);

                $voucher->setRelation('settlement', null);
                $revertedVouchers->push($voucher);
            }

            // Create audit log for settlement cancellation before deleting the record
            AuditLog::create([
                'store_id' => $settlement->store_id,
                'entity_name' => 'PettyCashSettlement',
                'entity_id' => $settlement->id,
                'action' => 'CANCEL_SETTLEMENT_RECAP',
                'performed_by_id' => $actor->id,
                'old_values' => [
                    'settlement_number' => $settlementNumber,
                    'total_amount_cents' => $settlementTotalCents,
                    'voucher_count' => $voucherCount,
                    'voucher_ids' => $voucherIds,
                ],
                'new_values' => [
                    'status' => 'CANCELLED',
                    'reason' => $trimmedReason,
                ],
                'ip_address' => $ipAddress,
            ]);

            $settlement->delete();

            return $revertedVouchers;
        });
    }
}
