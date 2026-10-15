<?php

namespace App\Services\Opname\Contracts;

use App\Models\CashOpnameSession;
use App\Services\Opname\DTOs\ReconcilerResult;

interface OpnameReconcilerInterface
{
    /**
     * Compute full reconciliation metrics for the given cash opname session.
     */
    public function compute(CashOpnameSession $session): ReconcilerResult;

    /**
     * Assert that the session has all mandatory evidence and reference lines
     * before it can be submitted by SAC for SS witness verification.
     *
     * @throws \DomainException If validation fails.
     */
    public function assertReadyForSubmission(CashOpnameSession $session): void;
}
