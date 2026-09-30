<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BatchSettleVouchersAction
{
    /**
     * Batch settle multiple disbursed vouchers (SAC only).
     *
     * @param  array<string>  $voucherIds
     * @return Collection<int, PettyCashVoucher>
     */
    public function execute(array $voucherIds, User $actor, ?string $ipAddress = null): Collection
    {
        if ($actor->role !== 'SAC') {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SAC yang berwenang melakukan penyelesaian (settlement) voucher.');
        }

        if (empty($voucherIds)) {
            throw new InvalidArgumentException('Pilih minimal satu voucher untuk diselesaikan.');
        }

        return DB::transaction(function () use ($voucherIds, $actor, $ipAddress) {
            $vouchers = PettyCashVoucher::whereIn('id', $voucherIds)
                ->where('store_id', $actor->store_id)
                ->lockForUpdate()
                ->get();

            if ($vouchers->count() !== count($voucherIds)) {
                throw new InvalidArgumentException('Satu atau lebih voucher tidak ditemukan di toko ini.');
            }

            foreach ($vouchers as $voucher) {
                if ($voucher->status !== PettyCashVoucher::STATUS_DISBURSED) {
                    throw new InvalidVoucherStateException(
                        "Voucher {$voucher->voucher_number} dengan status {$voucher->status} tidak dapat diselesaikan."
                    );
                }
            }

            $settledAt = now();
            $settledVouchers = collect();

            foreach ($vouchers as $voucher) {
                $oldValues = [
                    'status' => $voucher->status,
                    'settled_at' => $voucher->settled_at?->toISOString(),
                ];

                $voucher->update([
                    'status' => PettyCashVoucher::STATUS_SETTLED,
                    'settled_at' => $settledAt,
                ]);

                AuditLog::create([
                    'store_id' => $voucher->store_id,
                    'entity_name' => 'PettyCashVoucher',
                    'entity_id' => $voucher->id,
                    'action' => 'SETTLE_VOUCHER',
                    'performed_by_id' => $actor->id,
                    'old_values' => $oldValues,
                    'new_values' => [
                        'status' => $voucher->status,
                        'settled_at' => $settledAt->toISOString(),
                    ],
                    'ip_address' => $ipAddress,
                ]);

                $settledVouchers->push($voucher);
            }

            return $settledVouchers;
        });
    }
}
