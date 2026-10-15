<?php

namespace App\Services\Opname;

use App\Models\CashOpnameSession;
use App\Services\Opname\Contracts\OpnameReconcilerInterface;
use App\Services\Opname\Reconcilers\CashFlowReconciler;
use App\Services\Opname\Reconcilers\ConsignmentReconciler;
use App\Services\Opname\Reconcilers\SerialStockReconciler;
use App\Services\Opname\Reconcilers\StockCountReconciler;
use App\Services\Opname\Reconcilers\ThreePocketsReconciler;
use InvalidArgumentException;

class OpnameReconcilerFactory
{
    /**
     * Resolve the appropriate reconciler strategy for the given opname type.
     *
     * @throws InvalidArgumentException
     */
    public function make(string $opnameType): OpnameReconcilerInterface
    {
        return match ($opnameType) {
            CashOpnameSession::TYPE_KAS_KECIL => app(ThreePocketsReconciler::class),
            CashOpnameSession::TYPE_KAS_BESAR => app(CashFlowReconciler::class),
            CashOpnameSession::TYPE_MATERAI => app(StockCountReconciler::class),
            CashOpnameSession::TYPE_ACTIVE_SELLING => app(ConsignmentReconciler::class),
            CashOpnameSession::TYPE_GIFT_VOUCHER, 'VOUCHER' => app(SerialStockReconciler::class),
            default => throw new InvalidArgumentException("Tipe cash opname [{$opnameType}] tidak dikenali atau belum didukung."),
        };
    }
}
