<?php

namespace App\Services\Opname\Reconcilers;

use App\Models\CashOpnameSession;
use App\Models\VarianceResolution;
use App\Services\Opname\Contracts\OpnameReconcilerInterface;
use App\Services\Opname\DTOs\ReconcilerResult;

abstract class AbstractOpnameReconciler implements OpnameReconcilerInterface
{
    /**
     * Compute cumulative approved resolutions for this session.
     */
    protected function computeCumulativeResolved(CashOpnameSession $session): int
    {
        if (! $session->id) {
            return 0;
        }

        $resolvedShortage = (int) VarianceResolution::where('session_id', $session->id)
            ->where('status', VarianceResolution::STATUS_APPROVED)
            ->whereIn('kind', [VarianceResolution::KIND_REPLACED, VarianceResolution::KIND_WRITE_OFF])
            ->sum('amount_cents');

        $resolvedSurplus = (int) VarianceResolution::where('session_id', $session->id)
            ->where('status', VarianceResolution::STATUS_APPROVED)
            ->where('kind', VarianceResolution::KIND_FOUND)
            ->sum('amount_cents');

        return $resolvedShortage - $resolvedSurplus;
    }

    /**
     * Determine variance status from outstanding variance.
     */
    protected function determineVarianceStatus(int $outstandingVarianceCents): string
    {
        return match (true) {
            $outstandingVarianceCents === 0 => CashOpnameSession::VARIANCE_BALANCED,
            $outstandingVarianceCents > 0 => CashOpnameSession::VARIANCE_SURPLUS,
            default => CashOpnameSession::VARIANCE_SHORTAGE,
        };
    }

    /**
     * Build the ReconcilerResult DTO.
     *
     * @param  array<string, mixed>  $meta
     */
    protected function buildResult(
        int $physicalTotalCents,
        int $vouchersTotalCents,
        int $briCleanBalanceCents,
        int $totalActualCents,
        int $targetCents,
        CashOpnameSession $session,
        array $meta = []
    ): ReconcilerResult {
        $rawDiscrepancyCents = $totalActualCents - $targetCents;
        $cumulativeResolvedCents = $this->computeCumulativeResolved($session);
        $outstandingVarianceCents = $rawDiscrepancyCents + $cumulativeResolvedCents;
        $varianceStatus = $this->determineVarianceStatus($outstandingVarianceCents);

        return new ReconcilerResult(
            physicalTotalCents: $physicalTotalCents,
            vouchersTotalCents: $vouchersTotalCents,
            briCleanBalanceCents: $briCleanBalanceCents,
            totalActualCents: $totalActualCents,
            targetCents: $targetCents,
            rawDiscrepancyCents: $rawDiscrepancyCents,
            cumulativeResolvedCents: $cumulativeResolvedCents,
            outstandingVarianceCents: $outstandingVarianceCents,
            varianceStatus: $varianceStatus,
            meta: $meta
        );
    }
}
