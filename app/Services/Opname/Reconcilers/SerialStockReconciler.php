<?php

namespace App\Services\Opname\Reconcilers;

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameReferenceLine;
use App\Services\Opname\DTOs\ReconcilerResult;
use DomainException;

class SerialStockReconciler extends AbstractOpnameReconciler
{
    /**
     * Compute reconciliation for GIFT_VOUCHER:
     * Physical Count = Pencacahan fisik voucher per nominal
     * Expected Target = Saldo kartu stok aktif / rentang nomor seri (serial range).
     */
    public function compute(CashOpnameSession $session): ReconcilerResult
    {
        $itemCounts = $session->relationLoaded('itemCounts')
            ? $session->itemCounts
            : OpnameItemCount::with('itemDefinition')->where('session_id', $session->id)->get();

        $physicalTotalCents = (int) $itemCounts->sum('subtotal_cents');
        if ($physicalTotalCents === 0 && $session->physical_total_cents > 0) {
            $physicalTotalCents = (int) $session->physical_total_cents;
        }

        $vouchersTotalCents = 0;
        $briCleanBalanceCents = 0;
        $totalActualCents = $physicalTotalCents;

        // Fetch reference lines (e.g. SERIAL_RANGE or STOCK_OPENING)
        $refLines = $session->relationLoaded('referenceLines')
            ? $session->referenceLines
            : OpnameReferenceLine::where('session_id', $session->id)->get();

        $serialRangeLines = $refLines->where('line_type', OpnameReferenceLine::LINE_SERIAL_RANGE);
        $stockCardLines = $refLines->where('line_type', OpnameReferenceLine::LINE_STOCK_OPENING);

        if ($serialRangeLines->count() > 0) {
            $targetCents = (int) $serialRangeLines->sum('amount_cents');
        } elseif ($stockCardLines->count() > 0) {
            $targetCents = (int) $stockCardLines->sum('amount_cents');
        } else {
            // Calculate from expected_count if available
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
                'reconciliation_mode' => 'SERIAL_STOCK',
                'physical_voucher_quantity' => (int) $itemCounts->sum('count'),
                'serial_range_lines_count' => $serialRangeLines->count(),
                'serial_ranges' => $serialRangeLines->map(fn ($l) => [
                    'range' => $l->reference_number,
                    'quantity' => $l->quantity,
                    'amount_cents' => $l->amount_cents,
                ])->values()->all(),
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
            throw new DomainException('Pencacahan fisik stok gift voucher belum diisi.');
        }
    }
}
