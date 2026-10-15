<?php

namespace App\Services\Opname\Reconcilers;

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameReferenceLine;
use App\Services\Opname\DTOs\ReconcilerResult;
use DomainException;

class StockCountReconciler extends AbstractOpnameReconciler
{
    /**
     * Compute reconciliation for MATERAI (Duty Stamps):
     * Physical Count = Lembar materai kondisi GOOD * nominal.
     * Book Stock (Target) = Opening + Received - Used - Damaged.
     */
    public function compute(CashOpnameSession $session): ReconcilerResult
    {
        $itemCounts = $session->relationLoaded('itemCounts')
            ? $session->itemCounts
            : OpnameItemCount::with('itemDefinition')->where('session_id', $session->id)->get();

        // Physical Count = Lembar materai kondisi GOOD
        $goodItems = $itemCounts->filter(fn ($item) => empty($item->condition) || $item->condition === OpnameItemCount::CONDITION_GOOD);
        $damagedItems = $itemCounts->filter(fn ($item) => $item->condition === OpnameItemCount::CONDITION_DAMAGED);

        $physicalTotalCents = (int) $goodItems->sum('subtotal_cents');
        if ($physicalTotalCents === 0 && $session->physical_total_cents > 0) {
            $physicalTotalCents = (int) $session->physical_total_cents;
        }

        $vouchersTotalCents = 0;
        $briCleanBalanceCents = 0;
        $totalActualCents = $physicalTotalCents;

        // Fetch reference lines for Book Stock calculation
        $refLines = $session->relationLoaded('referenceLines')
            ? $session->referenceLines
            : OpnameReferenceLine::where('session_id', $session->id)->get();

        $openingCents = (int) $refLines->where('line_type', OpnameReferenceLine::LINE_STOCK_OPENING)->sum('amount_cents');
        $receivedCents = (int) $refLines->where('line_type', OpnameReferenceLine::LINE_STOCK_RECEIVED)->sum('amount_cents');
        $usedCents = (int) $refLines->where('line_type', OpnameReferenceLine::LINE_STOCK_USED)->sum('amount_cents');
        $damagedCents = (int) $refLines->where('line_type', OpnameReferenceLine::LINE_STOCK_DAMAGED)->sum('amount_cents');

        if ($refLines->count() > 0) {
            // Book Stock = Opening + Received - Used - Damaged
            $targetCents = $openingCents + $receivedCents - $usedCents - $damagedCents;
        } else {
            // Fallback: calculate from expected_count if available
            $expectedTotalCents = (int) $itemCounts->sum(function ($item) {
                $nominal = $item->itemDefinition?->nominal_cents ?? 0;

                return $item->expected_count * $nominal;
            });

            $targetCents = ($expectedTotalCents > 0) ? $expectedTotalCents : (int) $session->imprest_fund_cents;
        }

        return $this->buildResult(
            physicalTotalCents: $physicalTotalCents,
            vouchersTotalCents: $vouchersTotalCents,
            briCleanBalanceCents: $briCleanBalanceCents,
            totalActualCents: $totalActualCents,
            targetCents: $targetCents,
            session: $session,
            meta: [
                'reconciliation_mode' => 'STOCK_COUNT',
                'good_quantity' => (int) $goodItems->sum('count'),
                'damaged_quantity' => (int) $damagedItems->sum('count'),
                'damaged_amount_cents' => (int) $damagedItems->sum('subtotal_cents'),
                'opening_cents' => $openingCents,
                'received_cents' => $receivedCents,
                'used_cents' => $usedCents,
                'damaged_ref_cents' => $damagedCents,
            ]
        );
    }

    /**
     * Assert session is ready for submission.
     */
    public function assertReadyForSubmission(CashOpnameSession $session): void
    {
        $hasCounts = OpnameItemCount::where('session_id', $session->id)->exists();

        if (! $hasCounts && (int) $session->physical_total_cents === 0) {
            throw new DomainException('Pencacahan fisik stok materai belum diisi.');
        }
    }
}
