<?php

namespace App\Actions\Opname;

use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\User;
use App\Services\Opname\OpnameReconcilerFactory;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateDenominationsAction
{
    public function __construct(
        protected OpnameReconcilerFactory $reconcilerFactory
    ) {}

    /**
     * Update denomination counts for a cash opname session.
     *
     * @param  array<int, array{item_definition_id: string, count: int, expected_count?: int, condition?: string}>  $items
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
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

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

                $updatePayload = [
                    'count' => $count,
                    'subtotal_cents' => $subtotalCents,
                ];

                if (isset($itemData['expected_count'])) {
                    $updatePayload['expected_count'] = max(0, (int) $itemData['expected_count']);
                }

                if (! empty($itemData['condition'])) {
                    $updatePayload['condition'] = strtoupper((string) $itemData['condition']);
                }

                OpnameItemCount::updateOrCreate(
                    [
                        'session_id' => $session->id,
                        'item_definition_id' => $definition->id,
                    ],
                    $updatePayload
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

            // Delegate calculation to polymorphic reconciler
            $session->unsetRelation('itemCounts');
            $reconciler = $this->reconcilerFactory->make($session->opname_type);
            $result = $reconciler->compute($session);

            $session->update([
                'physical_total_cents' => $result->physicalTotalCents,
                'vouchers_total_cents' => $result->vouchersTotalCents,
                'bri_clean_balance_cents' => $result->briCleanBalanceCents,
                'total_actual_cents' => $result->totalActualCents,
                'target_reconciled_cents' => $result->targetCents,
                'raw_discrepancy_cents' => $result->rawDiscrepancyCents,
                'cumulative_resolved_cents' => $result->cumulativeResolvedCents,
                'outstanding_variance_cents' => $result->outstandingVarianceCents,
                'current_variance_cents' => $result->outstandingVarianceCents,
                'variance_status' => $result->varianceStatus,
            ]);

            // Audit log
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'UPDATE_DENOMINATIONS',
                'performed_by_id' => $actor->id,
                'old_values' => ['physical_total_cents' => $oldPhysicalTotal],
                'new_values' => ['physical_total_cents' => $result->physicalTotalCents],
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
