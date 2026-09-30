<?php

namespace App\Actions\Opname;

use App\Models\AuditLog;
use App\Models\BriSubLedger;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemCount;
use App\Models\OpnameItemDefinition;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use App\Services\BriBalanceService;
use App\Services\DocumentNumberGenerator;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class OpenSessionAction
{
    public function __construct(
        protected DocumentNumberGenerator $numberGenerator,
        protected BriBalanceService $briBalanceService
    ) {}

    /**
     * Open a new cash opname session or resume an existing DRAFT session.
     *
     * @throws AuthorizationException
     * @throws DomainException
     */
    public function execute(
        User $actor,
        string $opnameType = CashOpnameSession::TYPE_KAS_KECIL,
        ?string $ipAddress = null
    ): CashOpnameSession {
        // Enforce role: Only SAC can open opname sessions (FR-OPN-01, T-RBAC-01)
        if ($actor->role !== 'SAC') {
            throw new AuthorizationException('Hanya SAC yang dapat membuka sesi cash opname.');
        }

        if (! $actor->store_id) {
            throw new DomainException('Pengguna harus terdaftar pada sebuah toko.');
        }

        $store = Store::findOrFail($actor->store_id);

        // Check for existing pending/submitted sessions
        $pendingSession = CashOpnameSession::where('store_id', $store->id)
            ->where('opname_type', $opnameType)
            ->whereIn('status', [
                CashOpnameSession::STATUS_SUBMITTED,
                CashOpnameSession::STATUS_VERIFIED_SS,
            ])
            ->first();

        if ($pendingSession) {
            throw new DomainException("Sesi opname {$pendingSession->opname_number} masih dalam antrean verifikasi atau persetujuan.");
        }

        // Check for existing DRAFT session (resume if exists)
        $existingDraft = CashOpnameSession::where('store_id', $store->id)
            ->where('opname_type', $opnameType)
            ->where('status', CashOpnameSession::STATUS_DRAFT)
            ->first();

        if ($existingDraft) {
            // Auto-heal missing item definitions
            $this->autoHealItemCounts($existingDraft);

            // Refresh vouchers total in case new vouchers were disbursed
            $vouchersTotalCents = (int) PettyCashVoucher::where('store_id', $store->id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->sum('amount_cents');

            $existingDraft->vouchers_total_cents = $vouchersTotalCents;
            $existingDraft->total_actual_cents = $existingDraft->physical_total_cents
                + $vouchersTotalCents
                + $existingDraft->bri_clean_balance_cents;
            $existingDraft->current_variance_cents = $existingDraft->total_actual_cents
                - $existingDraft->target_reconciled_cents;
            $existingDraft->variance_status = $this->determineVarianceStatus($existingDraft->current_variance_cents);
            $existingDraft->save();

            return $existingDraft->load([
                'itemCounts.itemDefinition',
                'subLedger',
                'createdBy',
            ]);
        }

        return DB::transaction(function () use ($store, $actor, $opnameType, $ipAddress) {
            // Fetch V_prev from last APPROVED session of the same opname type (Rule 3)
            $lastApproved = CashOpnameSession::withoutGlobalScopes()
                ->where('store_id', $store->id)
                ->where('opname_type', $opnameType)
                ->where('status', CashOpnameSession::STATUS_APPROVED)
                ->orderByDesc('approved_sm_at')
                ->orderByDesc('created_at')
                ->first();

            $previousVarianceCents = $lastApproved ? $lastApproved->current_variance_cents : 0;

            // Fetch imprest fund ceiling
            $config = StoreOpnameConfig::where('store_id', $store->id)
                ->where('opname_type', $opnameType)
                ->first();
            $imprestFundCents = $config ? $config->imprest_fund_cents : 500000000;

            // Generate unique opname number (Rule 12)
            $opnameNumber = $this->numberGenerator->generateOpnameNumber($store, $opnameType);

            // Sum DISBURSED vouchers (Pocket 2: K_bon)
            $vouchersTotalCents = (int) PettyCashVoucher::where('store_id', $store->id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->sum('amount_cents');

            // Auto-populate BRI running balances from APPROVED postings (Pocket 3: K_bri)
            $b2b = $this->briBalanceService->getCategoryBalance($store->id, 'B2B');
            $event = $this->briBalanceService->getCategoryBalance($store->id, 'EVENT');
            $aksel = $this->briBalanceService->getCategoryBalance($store->id, 'AKSEL');
            $anonymous = $this->briBalanceService->getCategoryBalance($store->id, 'ANONYMOUS');
            $custom = $this->briBalanceService->getCategoryBalance($store->id, 'CUSTOM');

            $totalAllocations = $b2b + $event + $aksel + $anonymous + $custom;
            $briMutationTotal = 0;
            $netKasKecilBri = $briMutationTotal - $totalAllocations;

            // Calculations (Rule 2)
            $physicalTotalCents = 0;
            $briCleanBalanceCents = $netKasKecilBri;
            $totalActualCents = $physicalTotalCents + $vouchersTotalCents + $briCleanBalanceCents;
            $targetReconciledCents = $imprestFundCents + $previousVarianceCents;
            $currentVarianceCents = $totalActualCents - $targetReconciledCents;
            $varianceStatus = $this->determineVarianceStatus($currentVarianceCents);

            // Create CashOpnameSession
            $session = CashOpnameSession::create([
                'store_id' => $store->id,
                'opname_number' => $opnameNumber,
                'opname_type' => $opnameType,
                'status' => CashOpnameSession::STATUS_DRAFT,
                'date' => now()->toDateString(),
                'imprest_fund_cents' => $imprestFundCents,
                'previous_variance_cents' => $previousVarianceCents,
                'physical_total_cents' => $physicalTotalCents,
                'vouchers_total_cents' => $vouchersTotalCents,
                'bri_clean_balance_cents' => $briCleanBalanceCents,
                'total_actual_cents' => $totalActualCents,
                'target_reconciled_cents' => $targetReconciledCents,
                'current_variance_cents' => $currentVarianceCents,
                'variance_status' => $varianceStatus,
                'created_by_id' => $actor->id,
            ]);

            // Create BriSubLedger
            BriSubLedger::create([
                'session_id' => $session->id,
                'bri_mutation_total_cents' => $briMutationTotal,
                'b2b_allocation_cents' => $b2b,
                'event_allocation_cents' => $event,
                'aksel_allocation_cents' => $aksel,
                'anonymous_allocation_cents' => $anonymous,
                'custom_allocations_total_cents' => $custom,
                'net_kas_kecil_bri_cents' => $netKasKecilBri,
            ]);

            // Initialize item counts for active definitions (Rule 8)
            $definitions = OpnameItemDefinition::where('store_id', $store->id)
                ->where('opname_type', $opnameType)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get();

            foreach ($definitions as $definition) {
                OpnameItemCount::create([
                    'session_id' => $session->id,
                    'item_definition_id' => $definition->id,
                    'count' => 0,
                    'subtotal_cents' => 0,
                ]);
            }

            // Create audit log entry (Rule 10)
            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'OPEN_SESSION',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => $session->toArray(),
                'ip_address' => $ipAddress,
            ]);

            return $session->load([
                'itemCounts.itemDefinition',
                'subLedger',
                'createdBy',
            ]);
        });
    }

    /**
     * Auto-heal item counts: ensures all active item definitions exist as records (Rule 8).
     */
    public function autoHealItemCounts(CashOpnameSession $session): void
    {
        $definitions = OpnameItemDefinition::where('store_id', $session->store_id)
            ->where('opname_type', $session->opname_type)
            ->where('is_active', true)
            ->get();

        $existingDefinitionIds = OpnameItemCount::where('session_id', $session->id)
            ->pluck('item_definition_id')
            ->all();

        foreach ($definitions as $definition) {
            if (! in_array($definition->id, $existingDefinitionIds, true)) {
                OpnameItemCount::create([
                    'session_id' => $session->id,
                    'item_definition_id' => $definition->id,
                    'count' => 0,
                    'subtotal_cents' => 0,
                ]);
            }
        }
    }

    /**
     * Determine variance status string.
     */
    private function determineVarianceStatus(int $varianceCents): string
    {
        if ($varianceCents === 0) {
            return CashOpnameSession::VARIANCE_BALANCED;
        }

        return $varianceCents > 0
            ? CashOpnameSession::VARIANCE_SURPLUS
            : CashOpnameSession::VARIANCE_SHORTAGE;
    }
}
