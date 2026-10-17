<?php

namespace App\Actions\Voucher;

use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\PettyCashSettlement;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use App\Services\DocumentNumberGenerator;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BatchSettleVouchersAction
{
    public function __construct(
        protected DocumentNumberGenerator $numberGenerator
    ) {}

    /**
     * Batch settle multiple disbursed vouchers (SAC only).
     *
     * @param  array<string>  $voucherIds
     * @return Collection<int, PettyCashVoucher>
     */
    public function execute(array $voucherIds, User $actor, ?string $ipAddress = null, ?string $notes = null): Collection
    {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if ($actor->role !== 'SAC') {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SAC yang berwenang melakukan penyelesaian (settlement) voucher.');
        }

        if (empty($voucherIds)) {
            throw new InvalidArgumentException('Pilih minimal satu voucher untuk diselesaikan.');
        }

        return DB::transaction(function () use ($voucherIds, $actor, $ipAddress, $notes) {
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

            $store = $actor->store ?? Store::findOrFail($actor->store_id);
            $settlementNumber = $this->numberGenerator->generateSettlementNumber($store, now(), 'KKCL');
            $totalAmountCents = $vouchers->sum('amount_cents');

            $settlement = PettyCashSettlement::create([
                'store_id' => $actor->store_id,
                'settlement_number' => $settlementNumber,
                'total_amount_cents' => $totalAmountCents,
                'status' => PettyCashSettlement::STATUS_SETTLED,
                'settled_by_id' => $actor->id,
                'notes' => $notes,
            ]);

            AuditLog::create([
                'store_id' => $actor->store_id,
                'entity_name' => 'PettyCashSettlement',
                'entity_id' => $settlement->id,
                'action' => 'CREATE_SETTLEMENT_RECAP',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => [
                    'settlement_number' => $settlement->settlement_number,
                    'total_amount_cents' => $totalAmountCents,
                    'voucher_count' => $vouchers->count(),
                ],
                'ip_address' => $ipAddress,
            ]);

            $settledAt = now();
            $settledVouchers = collect();

            foreach ($vouchers as $voucher) {
                $oldValues = [
                    'status' => $voucher->status,
                    'settled_at' => $voucher->settled_at?->toISOString(),
                    'settlement_id' => $voucher->settlement_id,
                ];

                $voucher->update([
                    'settlement_id' => $settlement->id,
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
                        'settlement_id' => $settlement->id,
                    ],
                    'ip_address' => $ipAddress,
                ]);

                // Attach settlement to model in memory so caller can access it
                $voucher->setRelation('settlement', $settlement);
                $settledVouchers->push($voucher);
            }

            return $settledVouchers;
        });
    }
}
