<?php

namespace App\Actions\Opname;

use App\Actions\Notification\SendNotificationAction;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\PettyCashVoucher;
use App\Models\User;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SignOffSessionAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Store Manager reviews and executes final approval (sign-off).
     * Locks all data permanently into an immutable snapshot (Rule 4).
     *
     * @param  array{confirm_understanding?: bool, notes?: string|null}  $data
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
        // Rule 9: Valid state transition VERIFIED_SS -> APPROVED
        if ($session->status !== CashOpnameSession::STATUS_VERIFIED_SS) {
            throw new DomainException('Hanya sesi berstatus VERIFIED_SS yang dapat disetujui (sign-off) oleh Store Manager.');
        }

        // Role check: SM only and same store (FR-OPN-07, T-RBAC-03)
        if ($actor->role !== 'SM' || $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Hanya Store Manager (SM) yang berwenang memberikan persetujuan final (sign-off).');
        }

        // FR-OPN-07: confirm_understanding checkbox is required
        if (empty($data['confirm_understanding'])) {
            throw new InvalidArgumentException('Konfirmasi pemahaman selisih kas opname wajib dicentang sebelum persetujuan.');
        }

        return DB::transaction(function () use ($session, $data, $actor, $ipAddress) {
            $oldValues = $session->toArray();

            // Snapshot DISBURSED vouchers at this exact moment (4.6 Immutable Snapshot)
            $disbursedVouchersSnapshot = PettyCashVoucher::where('store_id', $session->store_id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->get(['id', 'voucher_number', 'amount_cents', 'requester_id', 'purpose', 'category'])
                ->toArray();

            // Snapshot denomination counts
            $denominationCountsSnapshot = $session->itemCounts()
                ->with('itemDefinition')
                ->get()
                ->toArray();

            // Snapshot BRI sub-ledger
            $subLedgerSnapshot = $session->subLedger ? $session->subLedger->load('customAllocations')->toArray() : null;

            $notes = ! empty($data['notes']) ? $data['notes'] : $session->notes;

            // Update session to APPROVED (LOCKS ALL DATA)
            $session->update([
                'status' => CashOpnameSession::STATUS_APPROVED,
                'approved_by_sm_id' => $actor->id,
                'approved_sm_at' => now(),
                'notes' => $notes,
            ]);

            // Complete immutable audit log entry (Rule 4 & Rule 10)
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'SIGN_OFF_SM',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => array_merge($session->fresh()->toArray(), [
                    'snapshot' => [
                        'vouchers_disbursed' => $disbursedVouchersSnapshot,
                        'item_counts' => $denominationCountsSnapshot,
                        'sub_ledger' => $subLedgerSnapshot,
                    ],
                ]),
                'ip_address' => $ipAddress,
            ]);

            // In-app notifications to SAC and SS
            $this->notificationAction->toStoreRoles(
                $session->store_id,
                ['SAC', 'SS'],
                'OPNAME_APPROVED',
                'Cash Opname Disetujui (Sign-Off Selesai)',
                "Sesi Cash Opname {$session->opname_number} telah disetujui secara final oleh Store Manager ({$actor->name}). Semua data sesi telah dikunci permanen.",
                'CASH_OPNAME_SESSION',
                $session->id
            );

            return $session->fresh([
                'itemCounts.itemDefinition',
                'subLedger.customAllocations',
                'createdBy',
                'verifiedBySs',
                'approvedBySm',
            ]);
        });
    }
}
