<?php

namespace App\Services\Opname\Reconcilers;

use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameReferenceLine;
use App\Services\Opname\DTOs\ReconcilerResult;
use DomainException;

class CashFlowReconciler extends AbstractOpnameReconciler
{
    /**
     * Compute reconciliation for KAS_BESAR using Cash Flow Model:
     * Physical Count = Kas fisik di brankas besar
     * Expected Target = Opening + Sum(Z-Report POS Sales) - Sum(Bank Deposits) - Sum(Payouts).
     */
    public function compute(CashOpnameSession $session): ReconcilerResult
    {
        $physicalTotalCents = $session->relationLoaded('itemCounts')
            ? (int) $session->itemCounts->sum('subtotal_cents')
            : (int) OpnameItemCount::where('session_id', $session->id)->sum('subtotal_cents');

        if ($physicalTotalCents === 0 && $session->physical_total_cents > 0) {
            $physicalTotalCents = (int) $session->physical_total_cents;
        }

        // KAS_BESAR has no K_bon or K_bri
        $vouchersTotalCents = 0;
        $briCleanBalanceCents = 0;
        $totalActualCents = $physicalTotalCents;

        // Fetch reference lines
        $refLines = $session->relationLoaded('referenceLines')
            ? $session->referenceLines
            : OpnameReferenceLine::where('session_id', $session->id)->get();

        // 1. Opening Balance
        $openingLine = $refLines->firstWhere('line_type', OpnameReferenceLine::LINE_STOCK_OPENING)
            ?? $refLines->firstWhere('line_type', 'OPENING_BALANCE');

        if ($openingLine) {
            $openingCents = (int) $openingLine->amount_cents;
        } else {
            // Fallback to last APPROVED KAS_BESAR session actual
            $lastApproved = CashOpnameSession::withoutGlobalScopes()
                ->where('store_id', $session->store_id)
                ->where('opname_type', CashOpnameSession::TYPE_KAS_BESAR)
                ->where('status', CashOpnameSession::STATUS_APPROVED)
                ->where('id', '!=', $session->id)
                ->latest('approved_sm_at')
                ->first();

            $openingCents = $lastApproved ? (int) $lastApproved->total_actual_cents : (int) $session->imprest_fund_cents;
        }

        // 2. Sum(POS Cash Sales Z-Report)
        $zReportSalesCents = (int) $refLines
            ->where('line_type', OpnameReferenceLine::LINE_Z_REPORT)
            ->sum('amount_cents');

        // 3. Sum(Bank Deposits / Setoran Bank)
        $bankDepositsCents = (int) $refLines
            ->where('line_type', OpnameReferenceLine::LINE_BANK_DEPOSIT)
            ->sum('amount_cents');

        // 4. Sum(Payouts / Pengeluaran Kas Besar)
        $payoutsCents = (int) $refLines
            ->where('line_type', OpnameReferenceLine::LINE_PAYOUT)
            ->sum('amount_cents');

        // Expected Cash in Safe = Opening + Sales - Deposits - Payouts
        $expectedCashCents = $openingCents + $zReportSalesCents - $bankDepositsCents - $payoutsCents;

        // If no cash flow lines were entered, default target to expectedCash or session imprest
        $targetCents = ($refLines->count() > 0) ? $expectedCashCents : (int) $session->imprest_fund_cents;

        return $this->buildResult(
            physicalTotalCents: $physicalTotalCents,
            vouchersTotalCents: $vouchersTotalCents,
            briCleanBalanceCents: $briCleanBalanceCents,
            totalActualCents: $totalActualCents,
            targetCents: $targetCents,
            session: $session,
            meta: [
                'reconciliation_mode' => 'CASH_FLOW',
                'opening_cents' => $openingCents,
                'z_report_sales_cents' => $zReportSalesCents,
                'bank_deposits_cents' => $bankDepositsCents,
                'payouts_cents' => $payoutsCents,
                'expected_cash_cents' => $expectedCashCents,
            ]
        );
    }

    /**
     * Assert session is ready for submission.
     * Enforces: Bukti Z-Report & slip setor wajib terlampir.
     */
    public function assertReadyForSubmission(CashOpnameSession $session): void
    {
        $refLines = OpnameReferenceLine::where('session_id', $session->id)->get();

        $zReportLines = $refLines->where('line_type', OpnameReferenceLine::LINE_Z_REPORT);
        $depositLines = $refLines->where('line_type', OpnameReferenceLine::LINE_BANK_DEPOSIT);

        if ($zReportLines->isEmpty() || $depositLines->isEmpty()) {
            throw new DomainException('Bukti Z-Report dan slip setor bank wajib dilampirkan sebelum pengajuan verifikasi Kas Besar.');
        }

        $missingZProof = $zReportLines->contains(fn ($line) => empty($line->proof_attachment_url));
        $missingDepositProof = $depositLines->contains(fn ($line) => empty($line->proof_attachment_url));

        if ($missingZProof || $missingDepositProof) {
            throw new DomainException('Bukti Z-Report dan slip setor bank wajib dilampirkan sebelum pengajuan verifikasi Kas Besar.');
        }
    }
}
