<?php

namespace App\Actions\Voucher;

use App\Exceptions\ForbiddenSelfApprovalException;
use App\Models\PettyCashVoucher;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkApproveVouchersAction
{
    public function __construct(
        protected ApproveVoucherAction $approveAction
    ) {}

    /**
     * Bulk approve multiple submitted vouchers.
     * Enforces Anti Self-Approval invariant: SAC cannot approve their own vouchers.
     *
     * @param  array<string>  $voucherIds
     * @return Collection<int, PettyCashVoucher>
     */
    public function execute(array $voucherIds, User $actor, ?string $ipAddress = null): Collection
    {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        $vouchers = PettyCashVoucher::with('requester')
            ->whereIn('id', $voucherIds)
            ->where('status', PettyCashVoucher::STATUS_SUBMITTED)
            ->get();

        if ($vouchers->isEmpty()) {
            return collect();
        }

        // Rule 5: Anti Self-Approval
        if ($actor->role === 'SAC') {
            $hasSelf = $vouchers->contains(fn ($v) => $v->requester_id === $actor->id);
            if ($hasSelf) {
                throw new ForbiddenSelfApprovalException('FORBIDDEN_SELF_APPROVAL: Anda tidak dapat menyetujui pengajuan milik sendiri.');
            }
        }

        return DB::transaction(function () use ($vouchers, $actor, $ipAddress) {
            $approved = collect();

            foreach ($vouchers as $voucher) {
                $approved->push($this->approveAction->execute($voucher, $actor, $ipAddress));
            }

            return $approved;
        });
    }
}
