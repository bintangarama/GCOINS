<?php

namespace App\Services\Opname\Reconcilers;

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameReferenceLine;
use App\Services\Opname\DTOs\ReconcilerResult;
use DomainException;

class ConsignmentReconciler extends AbstractOpnameReconciler
{
    /**
     * Compute reconciliation for ACTIVE_SELLING (Bazaar / Mobile Selling):
     * Physical Count = Uang tunai fisik event / bazar
     * Expected Target = Modal Awal + Hasil Jual Konsinyasi - Biaya Event - Setor Toko.
     */
    public function compute(CashOpnameSession $session): ReconcilerResult
    {
        $physicalTotalCents = $session->relationLoaded('itemCounts')
            ? (int) $session->itemCounts->sum('subtotal_cents')
            : (int) OpnameItemCount::where('session_id', $session->id)->sum('subtotal_cents');

        if ($physicalTotalCents === 0 && $session->physical_total_cents > 0) {
            $physicalTotalCents = (int) $session->physical_total_cents;
        }

        $vouchersTotalCents = 0;
        $briCleanBalanceCents = 0;
        $totalActualCents = $physicalTotalCents;

        // Fetch reference lines
        $refLines = $session->relationLoaded('referenceLines')
            ? $session->referenceLines
            : OpnameReferenceLine::where('session_id', $session->id)->get();

        $openingLine = $refLines->firstWhere('line_type', OpnameReferenceLine::LINE_STOCK_OPENING)
            ?? $refLines->firstWhere('line_type', 'MODAL_AWAL');

        $modalAwalCents = $openingLine ? (int) $openingLine->amount_cents : (int) $session->imprest_fund_cents;

        $consignmentSalesCents = (int) $refLines
            ->where('line_type', OpnameReferenceLine::LINE_CONSIGNMENT_SALES)
            ->sum('amount_cents');

        $eventExpenseCents = (int) $refLines
            ->where('line_type', OpnameReferenceLine::LINE_EVENT_EXPENSE)
            ->sum('amount_cents');

        $storeRemittanceCents = (int) $refLines
            ->where('line_type', OpnameReferenceLine::LINE_STORE_REMITTANCE)
            ->sum('amount_cents');

        // Target = Modal Awal + Hasil Jual Konsinyasi - Biaya Event - Setor Toko
        $expectedCashCents = $modalAwalCents + $consignmentSalesCents - $eventExpenseCents - $storeRemittanceCents;

        $targetCents = ($refLines->count() > 0) ? $expectedCashCents : (int) $session->imprest_fund_cents;

        return $this->buildResult(
            physicalTotalCents: $physicalTotalCents,
            vouchersTotalCents: $vouchersTotalCents,
            briCleanBalanceCents: $briCleanBalanceCents,
            totalActualCents: $totalActualCents,
            targetCents: $targetCents,
            session: $session,
            meta: [
                'reconciliation_mode' => 'CONSIGNMENT',
                'modal_awal_cents' => $modalAwalCents,
                'consignment_sales_cents' => $consignmentSalesCents,
                'event_expense_cents' => $eventExpenseCents,
                'store_remittance_cents' => $storeRemittanceCents,
                'expected_cash_cents' => $expectedCashCents,
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
            throw new DomainException('Perhitungan fisik kas hasil active selling belum diisi.');
        }
    }
}
