<?php

namespace App\Actions\BriFund;

use App\Actions\Notification\SendNotificationAction;
use App\Exceptions\DualControlException;
use App\Exceptions\InvalidBriPostingStateException;
use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\User;
use App\Services\BriBalanceService;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class ApproveOutflowAction
{
    /**
     * Threshold for mandatory Store Manager approval (Rp 100.000.000,00 = 10.000.000.000 cents).
     */
    public const SM_MANDATORY_THRESHOLD_CENTS = 10000000000;

    public function __construct(
        protected BriBalanceService $balanceService,
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Approve a pending BRI outflow posting.
     * Enforces:
     * 1. Dual Control (Rule 6): creator != approver; must be SS or SM
     * 2. Tiered Approval: >= Rp 100.000.000 requires SM approval directly
     * 3. Zero-Deficit Guard (Rule 7): Checked a SECOND time at approval
     * 4. Valid State Transition (Rule 9): PENDING_SS -> APPROVED
     */
    public function execute(BriFundPosting $posting, User $actor, ?string $ipAddress = null): BriFundPosting
    {
        // Rule 9: Valid State Transitions Only
        if ($posting->status !== BriFundPosting::STATUS_PENDING_SS || $posting->type !== BriFundPosting::TYPE_OUTFLOW) {
            throw new InvalidBriPostingStateException("Posting BRI dengan status {$posting->status} tidak dapat disetujui.");
        }

        // Store verification
        if ($actor->store_id !== $posting->store_id) {
            throw new DomainException('Anda tidak memiliki akses ke data toko ini.');
        }

        // Must be SS or SM
        if (! in_array($actor->role, ['SS', 'SM'], true)) {
            throw new DomainException('Hanya Store Supervisor (SS) atau Store Manager (SM) yang dapat menyetujui pengeluaran dana BRI.');
        }

        // Tiered Outflow Approval: >= Rp 100.000.000 requires SM approval directly
        if ($posting->amount_cents >= self::SM_MANDATORY_THRESHOLD_CENTS) {
            if ($actor->role !== 'SM') {
                throw new AuthorizationException('Penarikan dana >= Rp 100.000.000 wajib mendapatkan persetujuan langsung dari Store Manager.');
            }
        }

        // Rule 6: Dual Control (creator != approver)
        if ($actor->id === $posting->created_by_id) {
            throw new DualControlException('DUAL_CONTROL_VIOLATION: Pengguna yang membuat pengeluaran tidak dapat menyetujuinya sendiri.');
        }

        // Rule 7: Zero-Deficit Guard (Check 2 - at Approval time)
        $this->balanceService->assertZeroDeficit(
            $posting->store_id,
            $posting->entity_name,
            $posting->amount_cents,
            $posting->category
        );

        return DB::transaction(function () use ($posting, $actor, $ipAddress) {
            $oldValues = [
                'status' => $posting->status,
                'approved_by_id' => $posting->approved_by_id,
                'approved_at' => $posting->approved_at?->toISOString(),
            ];

            $approvedAt = now();

            $posting->update([
                'status' => BriFundPosting::STATUS_APPROVED,
                'approved_by_id' => $actor->id,
                'approved_at' => $approvedAt,
            ]);

            // Create Audit Log
            AuditLog::create([
                'store_id' => $posting->store_id,
                'entity_name' => 'BriFundPosting',
                'entity_id' => $posting->id,
                'action' => 'APPROVE_BRI_OUTFLOW',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'status' => $posting->status,
                    'approved_by_id' => $actor->id,
                    'approved_at' => $approvedAt->toISOString(),
                ],
                'ip_address' => $ipAddress,
            ]);

            // Notify creator
            if ($posting->createdBy) {
                $formattedAmount = 'Rp '.number_format($posting->amount_cents / 100, 0, ',', '.');
                $this->notificationAction->toUser(
                    $posting->createdBy,
                    'BRI_OUTFLOW_APPROVED',
                    'Pengeluaran Dana BRI Disetujui',
                    "Pengeluaran dana {$posting->entity_name} sebesar {$formattedAmount} telah disetujui oleh {$actor->name}.",
                    'BriFundPosting',
                    $posting->id
                );
            }

            return $posting;
        });
    }
}
