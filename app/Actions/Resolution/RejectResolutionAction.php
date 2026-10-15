<?php

namespace App\Actions\Resolution;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\VarianceResolution;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RejectResolutionAction
{
    /**
     * Reject a pending variance resolution.
     *
     * @throws AuthorizationException
     * @throws DomainException
     */
    public function execute(
        VarianceResolution $resolution,
        string $rejectionReason,
        User $actor,
        ?string $ipAddress = null
    ): VarianceResolution {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $resolution->store_id) {
            throw new AuthorizationException('Anda tidak berwenang menolak resolusi untuk toko lain.');
        }

        if (! in_array($actor->role, ['SS', 'SM', 'SYSTEM_ADMIN'], true)) {
            throw new AuthorizationException('Hanya Store Supervisor (SS) atau Store Manager (SM) yang berwenang menolak resolusi selisih.');
        }

        $reason = trim($rejectionReason);
        if (empty($reason)) {
            throw new InvalidArgumentException('Alasan penolakan resolusi wajib diisi.');
        }

        if ($resolution->status !== VarianceResolution::STATUS_PENDING) {
            throw new DomainException('Hanya resolusi berstatus PENDING yang dapat ditolak.');
        }

        return DB::transaction(function () use ($resolution, $reason, $actor, $ipAddress) {
            $oldValues = $resolution->toArray();

            $resolution->update([
                'status' => VarianceResolution::STATUS_REJECTED,
                'approved_by_id' => $actor->id,
                'rejection_reason' => $reason,
            ]);

            AuditLog::create([
                'store_id' => $resolution->store_id,
                'entity_name' => VarianceResolution::class,
                'entity_id' => $resolution->id,
                'action' => 'REJECT_RESOLUTION',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => $resolution->fresh()->toArray(),
                'ip_address' => $ipAddress,
            ]);

            return $resolution->fresh();
        });
    }
}
