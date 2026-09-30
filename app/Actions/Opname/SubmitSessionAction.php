<?php

namespace App\Actions\Opname;

use App\Actions\Notification\SendNotificationAction;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\User;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class SubmitSessionAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Submit an opname session for SS verification.
     *
     * @throws DomainException
     * @throws AuthorizationException
     */
    public function execute(
        CashOpnameSession $session,
        User $actor,
        ?string $ipAddress = null
    ): CashOpnameSession {
        // Rule 9: Valid state transition DRAFT -> SUBMITTED
        if ($session->status !== CashOpnameSession::STATUS_DRAFT) {
            throw new DomainException('Hanya sesi berstatus DRAFT yang dapat diajukan untuk verifikasi.');
        }

        // Role check: SAC only and same store
        if ($actor->role !== 'SAC' || $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Hanya petugas SAC yang dapat mengajukan sesi cash opname.');
        }

        return DB::transaction(function () use ($session, $actor, $ipAddress) {
            $oldValues = $session->toArray();

            $session->update([
                'status' => CashOpnameSession::STATUS_SUBMITTED,
            ]);

            // Audit Log
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'SUBMIT_SESSION',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => $session->fresh()->toArray(),
                'ip_address' => $ipAddress,
            ]);

            // In-app notification to SS
            $this->notificationAction->toStoreRoles(
                $session->store_id,
                ['SS'],
                'OPNAME_SUBMITTED',
                'Pengajuan Verifikasi Cash Opname',
                "Sesi Cash Opname {$session->opname_number} telah diajukan oleh {$actor->name} dan menunggu verifikasi saksi fisik brankas.",
                'CASH_OPNAME_SESSION',
                $session->id
            );

            return $session->fresh([
                'itemCounts.itemDefinition',
                'subLedger.customAllocations',
                'createdBy',
            ]);
        });
    }
}
