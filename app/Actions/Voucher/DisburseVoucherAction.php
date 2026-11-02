<?php

namespace App\Actions\Voucher;

use App\Actions\Concerns\CalculatesVariance;
use App\Exceptions\InvalidVoucherStateException;
use App\Models\AuditLog;
use App\Models\BriSubLedger;
use App\Models\CashOpnameSession;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DisburseVoucherAction
{
    use CalculatesVariance;

    /**
     * Disburse cash for an approved voucher (SAC only).
     */
    public function execute(PettyCashVoucher $voucher, User $actor, ?string $ipAddress = null): PettyCashVoucher
    {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if ($actor->role !== 'SAC') {
            throw new AuthorizationException('FORBIDDEN_ROLE: Hanya SAC yang berwenang mencairkan kas kecil.');
        }

        if ($voucher->status !== PettyCashVoucher::STATUS_APPROVED_SS) {
            throw new InvalidVoucherStateException("Voucher dengan status {$voucher->status} tidak dapat dicairkan.");
        }

        return DB::transaction(function () use ($voucher, $actor, $ipAddress) {
            $oldValues = [
                'status' => $voucher->status,
                'disbursed_by_id' => $voucher->disbursed_by_id,
                'disbursed_at' => $voucher->disbursed_at?->toISOString(),
            ];

            $disbursedAt = now();

            $voucher->update([
                'status' => PettyCashVoucher::STATUS_DISBURSED,
                'disbursed_by_id' => $actor->id,
                'disbursed_at' => $disbursedAt,
            ]);

            $this->clearPendingBankAdminFees($voucher, $disbursedAt);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => 'DISBURSE_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $voucher->status,
                    'disbursed_by_id' => $actor->id,
                    'disbursed_at' => $disbursedAt->toISOString(),
                ],
                'ip_address' => $ipAddress,
            ]);

            return $voucher;
        });
    }

    /**
     * Automatically clear pending bank admin fees on BRI Sub-Ledgers and adjust active DRAFT session.
     */
    protected function clearPendingBankAdminFees(PettyCashVoucher $voucher, CarbonInterface $disbursedAt): void
    {
        if (! $voucher->clears_sub_ledger_id && $voucher->category !== 'BIAYA_ADMIN_BANK') {
            return;
        }

        // 1. Mark non-draft session sub-ledgers with pending bank admin fees as cleared by this voucher
        $nonDraftSessionIds = CashOpnameSession::withoutGlobalScopes()
            ->where('store_id', $voucher->store_id)
            ->where('opname_type', CashOpnameSession::TYPE_KAS_KECIL)
            ->where('status', '!=', CashOpnameSession::STATUS_DRAFT)
            ->pluck('id');

        if ($nonDraftSessionIds->isNotEmpty()) {
            BriSubLedger::whereIn('session_id', $nonDraftSessionIds)
                ->where('bank_admin_fee_cents', '>', 0)
                ->whereNull('cleared_by_voucher_id')
                ->update([
                    'cleared_by_voucher_id' => $voucher->id,
                    'cleared_at' => $disbursedAt,
                ]);
        }

        if ($voucher->clears_sub_ledger_id) {
            BriSubLedger::where('id', $voucher->clears_sub_ledger_id)
                ->whereNull('cleared_by_voucher_id')
                ->update([
                    'cleared_by_voucher_id' => $voucher->id,
                    'cleared_at' => $disbursedAt,
                ]);
        }

        // 2. Proportionally deduct from any active DRAFT KAS_KECIL session in the same store
        $draftSession = CashOpnameSession::withoutGlobalScopes()
            ->where('store_id', $voucher->store_id)
            ->where('opname_type', CashOpnameSession::TYPE_KAS_KECIL)
            ->where('status', CashOpnameSession::STATUS_DRAFT)
            ->latest()
            ->first();

        if (! $draftSession) {
            return;
        }

        $draftSubLedger = BriSubLedger::where('session_id', $draftSession->id)->first();
        if (! $draftSubLedger || $draftSubLedger->bank_admin_fee_cents <= 0) {
            return;
        }

        $remainingFeeCents = max(0, (int) $draftSubLedger->bank_admin_fee_cents - (int) $voucher->amount_cents);
        $totalAllocations = (int) $draftSubLedger->b2b_allocation_cents
            + (int) $draftSubLedger->event_allocation_cents
            + (int) $draftSubLedger->aksel_allocation_cents
            + (int) $draftSubLedger->anonymous_allocation_cents
            + (int) $draftSubLedger->custom_allocations_total_cents;

        $netKasKecilBri = ((int) $draftSubLedger->bri_mutation_total_cents - $totalAllocations) + $remainingFeeCents;

        $draftSubLedger->update([
            'bank_admin_fee_cents' => $remainingFeeCents,
            'bank_admin_fee_notes' => $remainingFeeCents > 0 ? $draftSubLedger->bank_admin_fee_notes : null,
            'net_kas_kecil_bri_cents' => $netKasKecilBri,
            'cleared_by_voucher_id' => $remainingFeeCents === 0 ? $voucher->id : null,
            'cleared_at' => $remainingFeeCents === 0 ? $disbursedAt : null,
        ]);

        $vouchersTotalCents = (int) PettyCashVoucher::withoutGlobalScopes()
            ->where('store_id', $voucher->store_id)
            ->where('status', PettyCashVoucher::STATUS_DISBURSED)
            ->sum('amount_cents');

        $totalActualCents = (int) $draftSession->physical_total_cents + $vouchersTotalCents + $netKasKecilBri;
        $varianceData = $this->computeVariance($totalActualCents, (int) $draftSession->imprest_fund_cents, $draftSession->id);

        $draftSession->update([
            'vouchers_total_cents' => $vouchersTotalCents,
            'bri_clean_balance_cents' => $netKasKecilBri,
            'total_actual_cents' => $totalActualCents,
            'raw_discrepancy_cents' => $varianceData['raw_discrepancy_cents'],
            'cumulative_resolved_cents' => $varianceData['cumulative_resolved_cents'],
            'outstanding_variance_cents' => $varianceData['outstanding_variance_cents'],
            'current_variance_cents' => $varianceData['outstanding_variance_cents'],
            'variance_status' => $varianceData['variance_status'],
        ]);
    }
}
