<?php

namespace App\Actions\BriFund;

use App\Actions\Notification\SendNotificationAction;
use App\Exceptions\InvalidBriPostingStateException;
use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RejectOutflowAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Reject a pending BRI outflow posting.
     * Enforces:
     * 1. Status must be PENDING_SS and type OUTFLOW
     * 2. Actor must be SS or SM
     * 3. Rejection reason is mandatory
     */
    public function execute(BriFundPosting $posting, User $actor, string $rejectionReason, ?string $ipAddress = null): BriFundPosting
    {
        // Rule 9: Valid State Transitions Only
        if ($posting->status !== BriFundPosting::STATUS_PENDING_SS || $posting->type !== BriFundPosting::TYPE_OUTFLOW) {
            throw new InvalidBriPostingStateException("Posting BRI dengan status {$posting->status} tidak dapat ditolak.");
        }

        // Store verification
        if ($actor->store_id !== $posting->store_id) {
            throw new DomainException('Anda tidak memiliki akses ke data toko ini.');
        }

        // Must be SS or SM
        if (! in_array($actor->role, ['SS', 'SM'], true)) {
            throw new DomainException('Hanya Store Supervisor (SS) atau Store Manager (SM) yang dapat menolak pengeluaran dana BRI.');
        }

        $trimmedReason = trim($rejectionReason);
        if (empty($trimmedReason)) {
            throw new InvalidArgumentException('Alasan penolakan wajib diisi.');
        }

        return DB::transaction(function () use ($posting, $actor, $trimmedReason, $ipAddress) {
            $oldValues = [
                'status' => $posting->status,
                'approved_by_id' => $posting->approved_by_id,
                'approved_at' => $posting->approved_at?->toISOString(),
                'rejection_reason' => $posting->rejection_reason,
            ];

            $approvedAt = now();

            $posting->update([
                'status' => BriFundPosting::STATUS_REJECTED,
                'approved_by_id' => $actor->id,
                'approved_at' => $approvedAt,
                'rejection_reason' => $trimmedReason,
            ]);

            // Create Audit Log
            AuditLog::create([
                'store_id' => $posting->store_id,
                'entity_name' => 'BriFundPosting',
                'entity_id' => $posting->id,
                'action' => 'REJECT_BRI_OUTFLOW',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $posting->status,
                    'approved_by_id' => $actor->id,
                    'approved_at' => $approvedAt->toISOString(),
                    'rejection_reason' => $trimmedReason,
                ],
                'ip_address' => $ipAddress,
            ]);

            // Notify creator
            if ($posting->createdBy) {
                $formattedAmount = 'Rp '.number_format($posting->amount_cents / 100, 0, ',', '.');
                $this->notificationAction->toUser(
                    $posting->createdBy,
                    'BRI_OUTFLOW_REJECTED',
                    'Pengeluaran Dana BRI Ditolak',
                    "Pengeluaran dana {$posting->entity_name} sebesar {$formattedAmount} ditolak oleh {$actor->name}. Alasan: {$trimmedReason}",
                    'BriFundPosting',
                    $posting->id
                );
            }

            return $posting;
        });
    }
}
