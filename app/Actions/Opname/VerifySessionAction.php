<?php

namespace App\Actions\Opname;

use App\Actions\Notification\SendNotificationAction;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\User;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class VerifySessionAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * SS witnesses physical cash count and verifies the session.
     *
     * @throws DomainException
     * @throws AuthorizationException
     */
    public function execute(
        CashOpnameSession $session,
        User $actor,
        ?string $ipAddress = null
    ): CashOpnameSession {
        // Rule 9: Valid state transition SUBMITTED -> VERIFIED_SS
        if ($session->status !== CashOpnameSession::STATUS_SUBMITTED) {
            throw new DomainException('Hanya sesi berstatus SUBMITTED yang dapat diverifikasi oleh saksi.');
        }

        // Role check: SS only and same store
        if ($actor->role !== 'SS' || $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Hanya Store Supervisor (SS) yang dapat memverifikasi cash opname sebagai saksi.');
        }

        return DB::transaction(function () use ($session, $actor, $ipAddress) {
            $oldValues = $session->toArray();

            $session->update([
                'status' => CashOpnameSession::STATUS_VERIFIED_SS,
                'verified_by_ss_id' => $actor->id,
                'verified_ss_at' => now(),
            ]);

            // Audit Log
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'VERIFY_SESSION_SS',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => $session->fresh()->toArray(),
                'ip_address' => $ipAddress,
            ]);

            // In-app notification to SM
            $this->notificationAction->toStoreRoles(
                $session->store_id,
                ['SM'],
                'OPNAME_VERIFIED_SS',
                'Verifikasi Saksi Cash Opname Selesai',
                "Sesi Cash Opname {$session->opname_number} telah diverifikasi oleh {$actor->name} (SS) dan menunggu persetujuan (sign-off) Store Manager.",
                'CASH_OPNAME_SESSION',
                $session->id
            );

            return $session->fresh([
                'itemCounts.itemDefinition',
                'subLedger.customAllocations',
                'createdBy',
                'verifiedBySs',
            ]);
        });
    }
}
