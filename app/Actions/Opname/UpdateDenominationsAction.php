<?php

namespace App\Actions\Opname;

use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\User;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class UpdateDenominationsAction
{
    /**
     * Update denomination counts for a cash opname session.
     *
     * @param  array<int, array{item_definition_id: string, count: int}>  $items
     *
     * @throws DomainException
     * @throws AuthorizationException
     */
    public function execute(
        CashOpnameSession $session,
        array $items,
        User $actor,
        ?string $ipAddress = null
    ): CashOpnameSession {
        // Rule 4: Immutable snapshot on approval
        if ($session->status === CashOpnameSession::STATUS_APPROVED) {
            throw new DomainException('SESSION_LOCKED: Sesi opname yang sudah disetujui tidak dapat diubah.');
        }

        // Only DRAFT sessions can be modified
        if ($session->status !== CashOpnameSession::STATUS_DRAFT) {
            throw new DomainException('Sesi opname hanya dapat diedit saat berstatus DRAFT.');
        }

        // Authorization check: SAC only and same store
        if ($actor->role !== 'SAC' || $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Hanya SAC dari toko yang bersangkutan yang dapat memperbarui pecahan uang.');
        }

        return DB::transaction(function () use ($session, $items, $actor, $ipAddress) {
            $oldPhysicalTotal = $session->physical_total_cents;

            // Fetch valid item definitions for this store & opname type
            $validDefinitions = OpnameItemDefinition::where('store_id', $session->store_id)
                ->where('opname_type', $session->opname_type)
                ->get()
                ->keyBy('id');

            foreach ($items as $itemData) {
                $definitionId = $itemData['item_definition_id'];
                $count = max(0, (int) $itemData['count']);

                $definition = $validDefinitions->get($definitionId);
                if (! $definition) {
                    continue;
                }

                $subtotalCents = $count * $definition->nominal_cents;

                OpnameItemCount::updateOrCreate(
                    [
                        'session_id' => $session->id,
                        'item_definition_id' => $definition->id,
                    ],
                    [
                        'count' => $count,
                        'subtotal_cents' => $subtotalCents,
                    ]
                );
            }

            // Rule 8: Auto-heal missing item definitions
            $existingDefinitionIds = OpnameItemCount::where('session_id', $session->id)
                ->pluck('item_definition_id')
                ->all();

            foreach ($validDefinitions as $definition) {
                if (! in_array($definition->id, $existingDefinitionIds, true)) {
                    OpnameItemCount::create([
                        'session_id' => $session->id,
                        'item_definition_id' => $definition->id,
                        'count' => 0,
                        'subtotal_cents' => 0,
                    ]);
                }
            }

            // Recalculate totals
            $physicalTotalCents = (int) OpnameItemCount::where('session_id', $session->id)->sum('subtotal_cents');

            $vouchersTotalCents = (int) PettyCashVoucher::where('store_id', $session->store_id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->sum('amount_cents');

            $briCleanBalanceCents = $session->subLedger?->net_kas_kecil_bri_cents ?? 0;

            $totalActualCents = $physicalTotalCents + $vouchersTotalCents + $briCleanBalanceCents;
            $targetReconciledCents = $session->imprest_fund_cents + $session->previous_variance_cents;
            $currentVarianceCents = $totalActualCents - $targetReconciledCents;

            $varianceStatus = match (true) {
                $currentVarianceCents === 0 => CashOpnameSession::VARIANCE_BALANCED,
                $currentVarianceCents > 0 => CashOpnameSession::VARIANCE_SURPLUS,
                default => CashOpnameSession::VARIANCE_SHORTAGE,
            };

            $session->update([
                'physical_total_cents' => $physicalTotalCents,
                'vouchers_total_cents' => $vouchersTotalCents,
                'bri_clean_balance_cents' => $briCleanBalanceCents,
                'total_actual_cents' => $totalActualCents,
                'target_reconciled_cents' => $targetReconciledCents,
                'current_variance_cents' => $currentVarianceCents,
                'variance_status' => $varianceStatus,
            ]);

            // Audit log
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'UPDATE_DENOMINATIONS',
                'performed_by_id' => $actor->id,
                'old_values' => ['physical_total_cents' => $oldPhysicalTotal],
                'new_values' => ['physical_total_cents' => $physicalTotalCents],
                'ip_address' => $ipAddress,
            ]);

            return $session->fresh([
                'itemCounts.itemDefinition',
                'subLedger',
                'createdBy',
            ]);
        });
    }
}
