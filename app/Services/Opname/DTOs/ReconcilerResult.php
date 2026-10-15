<?php

namespace App\Services\Opname\DTOs;

class ReconcilerResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public readonly int $physicalTotalCents,
        public readonly int $vouchersTotalCents,
        public readonly int $briCleanBalanceCents,
        public readonly int $totalActualCents,
        public readonly int $targetCents,
        public readonly int $rawDiscrepancyCents,
        public readonly int $cumulativeResolvedCents,
        public readonly int $outstandingVarianceCents,
        public readonly string $varianceStatus,
        public readonly array $meta = []
    ) {}
}
