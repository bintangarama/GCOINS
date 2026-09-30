<?php

namespace App\Actions\Opname;

use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\BriCustomAllocation;
use App\Models\BriSubLedger;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\PettyCashVoucher;
use App\Models\User;
use App\Services\BriBalanceService;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UpdateBriSubledgerAction
{
    public function __construct(
        protected BriBalanceService $briBalanceService
    ) {}

    /**
     * Update BRI Sub-Ledger for a cash opname session.
     *
     * @param  array{
     *     bri_mutation_total_cents?: int,
     *     statement_proof?: UploadedFile|string|null,
     *     custom_allocations?: array<int, array{name: string, amount_cents: int, notes?: string|null}>
     * }  $data
     *
     * @throws DomainException
     * @throws AuthorizationException
     */
    public function execute(
        CashOpnameSession $session,
        array $data,
        User $actor,
        ?string $ipAddress = null
    ): CashOpnameSession {
        // Rule 4: Immutable snapshot on approval (T-LCK-03)
        if ($session->status === CashOpnameSession::STATUS_APPROVED) {
            throw new DomainException('SESSION_LOCKED: Sesi opname yang sudah disetujui tidak dapat diubah.');
        }

        // Only DRAFT sessions can be modified
        if ($session->status !== CashOpnameSession::STATUS_DRAFT) {
            throw new DomainException('Sesi opname hanya dapat diedit saat berstatus DRAFT.');
        }

        // Authorization check: SAC only and same store
        if ($actor->role !== 'SAC' || $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Hanya SAC dari toko yang bersangkutan yang dapat memperbarui sub-ledger BRI.');
        }

        return DB::transaction(function () use ($session, $data, $actor, $ipAddress) {
            $subLedger = $session->subLedger ?: BriSubLedger::create([
                'session_id' => $session->id,
                'bri_mutation_total_cents' => 0,
                'b2b_allocation_cents' => 0,
                'event_allocation_cents' => 0,
                'aksel_allocation_cents' => 0,
                'anonymous_allocation_cents' => 0,
                'custom_allocations_total_cents' => 0,
                'net_kas_kecil_bri_cents' => 0,
            ]);

            $oldValues = $subLedger->toArray();

            // Auto-calculate / refresh category allocations from APPROVED postings
            $b2b = $this->briBalanceService->getCategoryBalance($session->store_id, 'B2B');
            $event = $this->briBalanceService->getCategoryBalance($session->store_id, 'EVENT');
            $aksel = $this->briBalanceService->getCategoryBalance($session->store_id, 'AKSEL');
            $anonymous = $this->briBalanceService->getCategoryBalance($session->store_id, 'ANONYMOUS');
            $systemCustom = $this->briBalanceService->getCategoryBalance($session->store_id, 'CUSTOM');

            // Handle custom allocations if provided
            $extraCustomTotal = 0;
            if (isset($data['custom_allocations']) && is_array($data['custom_allocations'])) {
                BriCustomAllocation::where('sub_ledger_id', $subLedger->id)->delete();
                foreach ($data['custom_allocations'] as $customItem) {
                    if (! empty($customItem['name']) && isset($customItem['amount_cents'])) {
                        $amount = max(0, (int) $customItem['amount_cents']);
                        BriCustomAllocation::create([
                            'sub_ledger_id' => $subLedger->id,
                            'name' => $customItem['name'],
                            'amount_cents' => $amount,
                            'notes' => $customItem['notes'] ?? null,
                        ]);
                        $extraCustomTotal += $amount;
                    }
                }
            } else {
                $extraCustomTotal = (int) BriCustomAllocation::where('sub_ledger_id', $subLedger->id)->sum('amount_cents');
            }

            $totalCustom = $systemCustom + $extraCustomTotal;

            // Handle statement photo upload
            $statementProofUrl = $subLedger->statement_proof_url;
            if (! empty($data['statement_proof'])) {
                $statementProofUrl = $this->storeProofAttachment($data['statement_proof'], $session, $actor);
            }

            // Mutation total
            $mutationTotal = isset($data['bri_mutation_total_cents'])
                ? max(0, (int) $data['bri_mutation_total_cents'])
                : $subLedger->bri_mutation_total_cents;

            // Net Kas Kecil BRI: K_bri = mutation - sum(allocations) (T-BRI-02)
            $totalAllocations = $b2b + $event + $aksel + $anonymous + $totalCustom;
            $netKasKecilBri = $this->briBalanceService->calculatePettyCashPortion($mutationTotal, $totalAllocations);

            $subLedger->update([
                'bri_mutation_total_cents' => $mutationTotal,
                'b2b_allocation_cents' => $b2b,
                'event_allocation_cents' => $event,
                'aksel_allocation_cents' => $aksel,
                'anonymous_allocation_cents' => $anonymous,
                'custom_allocations_total_cents' => $totalCustom,
                'statement_proof_url' => $statementProofUrl,
                'net_kas_kecil_bri_cents' => $netKasKecilBri,
            ]);

            // Recalculate session totals and live variance
            $physicalTotalCents = (int) OpnameItemCount::where('session_id', $session->id)->sum('subtotal_cents');

            $vouchersTotalCents = (int) PettyCashVoucher::where('store_id', $session->store_id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->sum('amount_cents');

            $briCleanBalanceCents = $netKasKecilBri;
            $totalActualCents = $physicalTotalCents + $vouchersTotalCents + $briCleanBalanceCents;
            $targetReconciledCents = $session->imprest_fund_cents + $session->previous_variance_cents;
            $currentVarianceCents = $totalActualCents - $targetReconciledCents;

            $varianceStatus = match (true) {
                $currentVarianceCents === 0 => CashOpnameSession::VARIANCE_BALANCED,
                $currentVarianceCents > 0 => CashOpnameSession::VARIANCE_SURPLUS,
                default => CashOpnameSession::VARIANCE_SHORTAGE,
            };

            $session->update([
                'physical_total_cents' => $physicalTotalCents,
                'vouchers_total_cents' => $vouchersTotalCents,
                'bri_clean_balance_cents' => $briCleanBalanceCents,
                'total_actual_cents' => $totalActualCents,
                'target_reconciled_cents' => $targetReconciledCents,
                'current_variance_cents' => $currentVarianceCents,
                'variance_status' => $varianceStatus,
            ]);

            // Audit log
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'UPDATE_BRI_SUBLEDGER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => $subLedger->fresh()->toArray(),
                'ip_address' => $ipAddress,
            ]);

            return $session->fresh([
                'itemCounts.itemDefinition',
                'subLedger.customAllocations',
                'createdBy',
            ]);
        });
    }

    /**
     * Store statement proof attachment.
     */
    protected function storeProofAttachment(
        UploadedFile|string $file,
        CashOpnameSession $session,
        User $actor
    ): string {
        if (is_string($file)) {
            Attachment::create([
                'store_id' => $session->store_id,
                'entity_type' => 'CASH_OPNAME_SESSION',
                'entity_id' => $session->id,
                'category' => 'BANK_STATEMENT',
                'file_name' => basename($file),
                'file_path' => $file,
                'file_size_bytes' => 0,
                'mime_type' => 'image/webp',
                'uploaded_by_id' => $actor->id,
                'created_at' => now(),
            ]);

            return $file;
        }

        $path = $file->store('opnames', 'public');
        $url = Storage::url($path);

        Attachment::create([
            'store_id' => $session->store_id,
            'entity_type' => 'CASH_OPNAME_SESSION',
            'entity_id' => $session->id,
            'category' => 'BANK_STATEMENT',
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $url,
            'file_size_bytes' => $file->getSize() ?: 0,
            'mime_type' => $file->getMimeType() ?: 'image/webp',
            'uploaded_by_id' => $actor->id,
            'created_at' => now(),
        ]);

        return $url;
    }
}
