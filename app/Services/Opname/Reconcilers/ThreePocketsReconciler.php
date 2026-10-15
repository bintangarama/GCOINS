<?php

namespace App\Services\Opname\Reconcilers;

use App\Models\BriSubLedger;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\PettyCashVoucher;
use App\Services\Opname\DTOs\ReconcilerResult;
use DomainException;

class ThreePocketsReconciler extends AbstractOpnameReconciler
{
    /**
     * Compute reconciliation for KAS_KECIL using the Three Pockets Model:
     * TotalActual = K_fisik (Safe) + K_bon (Disbursed Vouchers) + K_bri (Net BRI Mutation)
     * Target = Imprest Fund Ceiling.
     */
    public function compute(CashOpnameSession $session): ReconcilerResult
    {
        $physicalTotalCents = $session->relationLoaded('itemCounts')
            ? (int) $session->itemCounts->sum('subtotal_cents')
            : (int) OpnameItemCount::where('session_id', $session->id)->sum('subtotal_cents');

        // If physical total from counts is 0 but session already has physical_total_cents set, preserve it
        if ($physicalTotalCents === 0 && $session->physical_total_cents > 0) {
            $physicalTotalCents = (int) $session->physical_total_cents;
        }

        // Pocket 2: K_bon (sum of outstanding DISBURSED petty cash vouchers)
        $vouchersTotalCents = (int) PettyCashVoucher::withoutGlobalScopes()
            ->where('store_id', $session->store_id)
            ->where('status', PettyCashVoucher::STATUS_DISBURSED)
            ->sum('amount_cents');

        if ($vouchersTotalCents === 0 && $session->vouchers_total_cents > 0) {
            $vouchersTotalCents = (int) $session->vouchers_total_cents;
        }

        // Pocket 3: K_bri (Net Kas Kecil in Bank BRI)
        $briCleanBalanceCents = $session->subLedger
            ? (int) $session->subLedger->net_kas_kecil_bri_cents
            : (int) (BriSubLedger::where('session_id', $session->id)->value('net_kas_kecil_bri_cents') ?? $session->bri_clean_balance_cents);

        $totalActualCents = $physicalTotalCents + $vouchersTotalCents + $briCleanBalanceCents;
        $targetCents = (int) $session->imprest_fund_cents;

        return $this->buildResult(
            physicalTotalCents: $physicalTotalCents,
            vouchersTotalCents: $vouchersTotalCents,
            briCleanBalanceCents: $briCleanBalanceCents,
            totalActualCents: $totalActualCents,
            targetCents: $targetCents,
            session: $session,
            meta: [
                'reconciliation_mode' => 'THREE_POCKETS',
                'pockets' => [
                    'k_fisik' => $physicalTotalCents,
                    'k_bon' => $vouchersTotalCents,
                    'k_bri' => $briCleanBalanceCents,
                ],
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
            throw new DomainException('Perhitungan fisik pecahan uang kas belum diisi.');
        }
    }
}
