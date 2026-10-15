<?php

namespace App\Actions\Concerns;

use App\Models\CashOpnameSession;
use App\Models\VarianceResolution;

trait CalculatesVariance
{
    /**
     * Calculate raw discrepancy, cumulative resolved, and outstanding variance.
     *
     * @return array{
     *     raw_discrepancy_cents: int,
     *     cumulative_resolved_cents: int,
     *     outstanding_variance_cents: int,
     *     variance_status: string
     * }
     */
    public function computeVariance(int $totalActualCents, int $imprestFundCents, ?string $sessionId = null): array
    {
        $rawDiscrepancyCents = $totalActualCents - $imprestFundCents;

        $cumulativeResolvedCents = 0;
        if ($sessionId) {
            $resolvedShortage = (int) VarianceResolution::where('session_id', $sessionId)
                ->where('status', VarianceResolution::STATUS_APPROVED)
                ->whereIn('kind', [VarianceResolution::KIND_REPLACED, VarianceResolution::KIND_WRITE_OFF])
                ->sum('amount_cents');

            $resolvedSurplus = (int) VarianceResolution::where('session_id', $sessionId)
                ->where('status', VarianceResolution::STATUS_APPROVED)
                ->where('kind', VarianceResolution::KIND_FOUND)
                ->sum('amount_cents');

            $cumulativeResolvedCents = $resolvedShortage - $resolvedSurplus;
        }

        $outstandingVarianceCents = $rawDiscrepancyCents + $cumulativeResolvedCents;

        $varianceStatus = match (true) {
            $outstandingVarianceCents === 0 => CashOpnameSession::VARIANCE_BALANCED,
            $outstandingVarianceCents > 0 => CashOpnameSession::VARIANCE_SURPLUS,
            default => CashOpnameSession::VARIANCE_SHORTAGE,
        };

        return [
            'raw_discrepancy_cents' => $rawDiscrepancyCents,
            'cumulative_resolved_cents' => $cumulativeResolvedCents,
            'outstanding_variance_cents' => $outstandingVarianceCents,
            'variance_status' => $varianceStatus,
        ];
    }
}
