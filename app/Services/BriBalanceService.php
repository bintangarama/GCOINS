<?php

namespace App\Services;

use App\Exceptions\InsufficientRunningBalanceException;
use App\Models\BriFundPosting;
use Illuminate\Support\Collection;

class BriBalanceService
{
    /**
     * Calculate running balance for a specific entity.
     * S_entity = Σ INFLOW_approved - Σ OUTFLOW_approved
     */
    public function getEntityBalance(string $storeId, string $entityName, ?string $category = null): int
    {
        $query = BriFundPosting::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('entity_name', $entityName)
            ->where('status', BriFundPosting::STATUS_APPROVED);

        if ($category !== null) {
            $query->where('category', $category);
        }

        $inflow = (int) (clone $query)->where('type', BriFundPosting::TYPE_INFLOW)->sum('amount_cents');
        $outflow = (int) (clone $query)->where('type', BriFundPosting::TYPE_OUTFLOW)->sum('amount_cents');

        return $inflow - $outflow;
    }

    /**
     * Calculate running balance for an entire category.
     * S_category = Σ S_entity for all entities in category
     */
    public function getCategoryBalance(string $storeId, string $category): int
    {
        $query = BriFundPosting::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('category', $category)
            ->where('status', BriFundPosting::STATUS_APPROVED);

        $inflow = (int) (clone $query)->where('type', BriFundPosting::TYPE_INFLOW)->sum('amount_cents');
        $outflow = (int) (clone $query)->where('type', BriFundPosting::TYPE_OUTFLOW)->sum('amount_cents');

        return $inflow - $outflow;
    }

    /**
     * Get running balances for all categories and their grand total.
     *
     * @return array{
     *     B2B: int,
     *     EVENT: int,
     *     AKSEL: int,
     *     ANONYMOUS: int,
     *     CUSTOM: int,
     *     TOTAL: int
     * }
     */
    public function getAllCategoryBalances(string $storeId): array
    {
        $balances = [];
        $total = 0;

        foreach (BriFundPosting::CATEGORIES as $category) {
            $catBalance = $this->getCategoryBalance($storeId, $category);
            $balances[$category] = $catBalance;
            $total += $catBalance;
        }

        $balances['TOTAL'] = $total;

        return $balances;
    }

    /**
     * Calculate K_bri (Petty Cash portion in BRI Bank).
     * Formula: K_bri = BRI_mutation_balance - Σ allocations
     */
    public function calculatePettyCashPortion(int $mutationBalanceCents, int $totalAllocationsCents): int
    {
        return $mutationBalanceCents - $totalAllocationsCents;
    }

    /**
     * Validate Zero-Deficit Guard (amount must not exceed running balance).
     *
     * @throws InsufficientRunningBalanceException
     */
    public function assertZeroDeficit(string $storeId, string $entityName, int $amountCents, ?string $category = null): void
    {
        $currentBalance = $this->getEntityBalance($storeId, $entityName, $category);

        if ($amountCents > $currentBalance) {
            $formattedAmount = 'Rp '.number_format($amountCents / 100, 0, ',', '.');
            $formattedBalance = 'Rp '.number_format($currentBalance / 100, 0, ',', '.');

            throw new InsufficientRunningBalanceException(
                "INSUFFICIENT_RUNNING_BALANCE: Nominal pengeluaran ({$formattedAmount}) melebihi saldo berjalan entitas ({$formattedBalance})."
            );
        }
    }

    /**
     * Get summary breakdown of entities with their running balances.
     */
    public function getEntitiesWithBalances(string $storeId, ?string $category = null): Collection
    {
        $query = BriFundPosting::withoutGlobalScopes()
            ->where('store_id', $storeId);

        if ($category !== null) {
            $query->where('category', $category);
        }

        // Fetch distinct entity list with category and custom name
        $entities = $query->select('entity_name', 'category', 'custom_category_name')
            ->distinct()
            ->get();

        return $entities->map(function ($item) use ($storeId) {
            $baseQuery = BriFundPosting::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where('entity_name', $item->entity_name)
                ->where('category', $item->category);

            $inflowTotal = (int) (clone $baseQuery)
                ->where('status', BriFundPosting::STATUS_APPROVED)
                ->where('type', BriFundPosting::TYPE_INFLOW)
                ->sum('amount_cents');

            $outflowTotal = (int) (clone $baseQuery)
                ->where('status', BriFundPosting::STATUS_APPROVED)
                ->where('type', BriFundPosting::TYPE_OUTFLOW)
                ->sum('amount_cents');

            $pendingOutflowTotal = (int) (clone $baseQuery)
                ->where('status', BriFundPosting::STATUS_PENDING_SS)
                ->where('type', BriFundPosting::TYPE_OUTFLOW)
                ->sum('amount_cents');

            $postingsCount = (int) (clone $baseQuery)->count();
            $lastPosting = (clone $baseQuery)->latest('created_at')->first();

            return [
                'entity_name' => $item->entity_name,
                'category' => $item->category,
                'custom_category_name' => $item->custom_category_name,
                'inflow_total_cents' => $inflowTotal,
                'outflow_total_cents' => $outflowTotal,
                'running_balance_cents' => $inflowTotal - $outflowTotal,
                'pending_outflow_cents' => $pendingOutflowTotal,
                'postings_count' => $postingsCount,
                'last_posting_at' => $lastPosting?->created_at?->toISOString(),
            ];
        });
    }
}
