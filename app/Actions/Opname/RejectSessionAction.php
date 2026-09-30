<?php

namespace App\Actions\Opname;

use App\Actions\Notification\SendNotificationAction;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\User;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RejectSessionAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Reject an opname session back to DRAFT (by SS or SM).
     *
     * @param  array{reason: string}  $data
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
        $reason = trim($data['reason'] ?? '');
        if (empty($reason)) {
            throw new InvalidArgumentException('Alasan penolakan wajib disertakan.');
        }

        // Validate actor & state transition
        if ($session->status === CashOpnameSession::STATUS_SUBMITTED) {
            if ($actor->role !== 'SS' || $actor->store_id !== $session->store_id) {
                throw new AuthorizationException('Hanya Store Supervisor (SS) yang dapat menolak sesi pada tahap verifikasi saksi.');
            }
        } elseif ($session->status === CashOpnameSession::STATUS_VERIFIED_SS) {
            if ($actor->role !== 'SM' || $actor->store_id !== $session->store_id) {
                throw new AuthorizationException('Hanya Store Manager (SM) yang dapat menolak sesi pada tahap persetujuan final.');
            }
        } else {
            throw new DomainException('Sesi opname tidak dapat ditolak pada status saat ini.');
        }

        return DB::transaction(function () use ($session, $reason, $actor, $ipAddress) {
            $oldValues = $session->toArray();

            $updateData = [
                'status' => CashOpnameSession::STATUS_DRAFT,
                'notes' => "Ditolak oleh {$actor->name} ({$actor->role}): {$reason}",
            ];

            // If rejected by SM, clear SS verification so SS re-witnesses next time
            if ($actor->role === 'SM') {
                $updateData['verified_by_ss_id'] = null;
                $updateData['verified_ss_at'] = null;
            }

            $session->update($updateData);

            // Audit Log
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'REJECT_OPNAME',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => array_merge($session->fresh()->toArray(), ['reason' => $reason]),
                'ip_address' => $ipAddress,
            ]);

            // In-app notification to SAC (creator)
            $this->notificationAction->toStoreRoles(
                $session->store_id,
                ['SAC'],
                'OPNAME_REJECTED',
                'Cash Opname Ditolak',
                "Sesi Cash Opname {$session->opname_number} ditolak oleh {$actor->name} ({$actor->role}) dengan alasan: \"{$reason}\". Sesi dikembalikan ke status DRAFT.",
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
