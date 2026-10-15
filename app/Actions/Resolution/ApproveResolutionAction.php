<?php

namespace App\Actions\Resolution;

use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\User;
use App\Models\VarianceResolution;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ApproveResolutionAction
{
    /**
     * Threshold limit for SS approval in cents (Rp 1.000.000,00).
     */
    public const SS_APPROVAL_THRESHOLD_CENTS = 100000000;

    /**
     * Approve a variance resolution.
     *
     * @throws AuthorizationException
     * @throws DomainException
     */
    public function execute(
        VarianceResolution $resolution,
        User $actor,
        ?string $ipAddress = null
    ): VarianceResolution {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        // Store scoping
        if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $resolution->store_id) {
            throw new AuthorizationException('Anda tidak berwenang menyetujui resolusi untuk toko lain.');
        }

        // Dual control: maker cannot approve their own resolution
        if ($actor->role !== 'SYSTEM_ADMIN' && $actor->id === $resolution->created_by_id) {
            throw new AuthorizationException('DUAL_CONTROL: Pembuat resolusi dilarang menyetujui pengajuannya sendiri.');
        }

        // Threshold and role authorization
        if ($actor->role !== 'SYSTEM_ADMIN') {
            if ($resolution->amount_cents > self::SS_APPROVAL_THRESHOLD_CENTS) {
                if ($actor->role !== 'SM') {
                    throw new AuthorizationException('Resolusi selisih di atas Rp 1.000.000 hanya boleh disetujui oleh Store Manager (SM).');
                }
            } else {
                if (! in_array($actor->role, ['SS', 'SM'], true)) {
                    throw new AuthorizationException('Hanya Store Supervisor (SS) atau Store Manager (SM) yang berwenang menyetujui resolusi selisih.');
                }
            }
        }

        if ($resolution->status !== VarianceResolution::STATUS_PENDING) {
            throw new DomainException('Hanya resolusi berstatus PENDING yang dapat disetujui.');
        }

        return DB::transaction(function () use ($resolution, $actor, $ipAddress) {
            $oldValues = $resolution->toArray();

            $resolution->update([
                'status' => VarianceResolution::STATUS_APPROVED,
                'approved_by_id' => $actor->id,
                'approved_at' => now(),
            ]);

            // Recalculate session variance
            $session = $resolution->session()->lockForUpdate()->first();
            if ($session) {
                $resolvedShortage = (int) VarianceResolution::where('session_id', $session->id)
                    ->where('status', VarianceResolution::STATUS_APPROVED)
                    ->whereIn('kind', [VarianceResolution::KIND_REPLACED, VarianceResolution::KIND_WRITE_OFF])
                    ->sum('amount_cents');

                $resolvedSurplus = (int) VarianceResolution::where('session_id', $session->id)
                    ->where('status', VarianceResolution::STATUS_APPROVED)
                    ->where('kind', VarianceResolution::KIND_FOUND)
                    ->sum('amount_cents');

                $cumulativeResolved = $resolvedShortage - $resolvedSurplus;
                $rawDiscrepancy = $session->total_actual_cents - $session->imprest_fund_cents;
                $outstandingVariance = $rawDiscrepancy + $cumulativeResolved;

                $varianceStatus = match (true) {
                    $outstandingVariance === 0 => CashOpnameSession::VARIANCE_BALANCED,
                    $outstandingVariance > 0 => CashOpnameSession::VARIANCE_SURPLUS,
                    default => CashOpnameSession::VARIANCE_SHORTAGE,
                };

                $session->update([
                    'raw_discrepancy_cents' => $rawDiscrepancy,
                    'cumulative_resolved_cents' => $cumulativeResolved,
                    'outstanding_variance_cents' => $outstandingVariance,
                    'current_variance_cents' => $outstandingVariance,
                    'variance_status' => $varianceStatus,
                ]);
            }

            AuditLog::create([
                'store_id' => $resolution->store_id,
                'entity_name' => VarianceResolution::class,
                'entity_id' => $resolution->id,
                'action' => 'APPROVE_RESOLUTION',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => $resolution->fresh()->toArray(),
                'ip_address' => $ipAddress,
            ]);

            return $resolution->fresh(['session', 'createdBy', 'approvedBy']);
        });
    }
}
