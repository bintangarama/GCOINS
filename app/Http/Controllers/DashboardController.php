<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\CashOpnameSession;
use App\Models\PettyCashCategory;
use App\Models\PettyCashVoucher;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $storeId = $user->store_id;

        // Imprest fund from store opname config
        $imprestCents = 0;
        if ($storeId) {
            $config = StoreOpnameConfig::where('store_id', $storeId)
                ->where('opname_type', 'KAS_KECIL')
                ->where('is_active', true)
                ->first();
            $imprestCents = $config?->imprest_fund_cents ?? 0;
        }

        // Pending vouchers count (SUBMITTED status, needing approval)
        $pendingVouchersCount = 0;
        if ($storeId) {
            $pendingVouchersCount = PettyCashVoucher::where('status', 'SUBMITTED')
                ->count();
        }

        // Pending BRI outflow count (PENDING_SS status)
        $pendingOutflowsCount = 0;
        if ($storeId) {
            $pendingOutflowsCount = BriFundPosting::where('status', 'PENDING_SS')
                ->count();
        }

        // Last opname session
        $lastOpname = null;
        if ($storeId) {
            $session = CashOpnameSession::latest('created_at')->first();
            if ($session) {
                $lastOpname = [
                    'id' => $session->id,
                    'session_number' => $session->opname_number ?? 'OPN-'.substr($session->id, 0, 8),
                    'status' => $session->status,
                    'variance_status' => $session->variance_status,
                    'date' => $session->date ? $session->date->toDateString() : $session->created_at->toDateString(),
                    'date_formatted' => $session->date ? $session->date->translatedFormat('d M Y') : $session->created_at->translatedFormat('d M Y'),
                ];
            }
        }

        // Recent activity feed (last 5 audit logs for this store)
        $recentActivity = [];
        if ($storeId) {
            $recentActivity = AuditLog::where('store_id', $storeId)
                ->with('performedBy:id,name,nik')
                ->latest('created_at')
                ->limit(5)
                ->get()
                ->map(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'entity_name' => $log->entity_name,
                    'entity_id' => $log->entity_id,
                    'performer' => $log->performedBy?->name ?? 'System',
                    'performer_nik' => $log->performedBy?->nik,
                    'created_at' => $log->created_at->toIso8601String(),
                ])
                ->toArray();
        }

        // Disbursed vouchers waiting for settlement (bon gantung kasir)
        $disbursedPendingSettlementCents = 0;
        if ($storeId) {
            $disbursedPendingSettlementCents = (int) PettyCashVoucher::where('status', 'DISBURSED')
                ->whereNull('settlement_id')
                ->sum('amount_cents');
        }
        $estimatedPhysicalCashCents = max(0, $imprestCents - $disbursedPendingSettlementCents);
        $burnRatePercentage = $imprestCents > 0
            ? min(100, (int) round(($disbursedPendingSettlementCents / $imprestCents) * 100))
            : 0;

        // Today's opname session check
        $todayOpname = null;
        if ($storeId) {
            $todaySession = CashOpnameSession::where(function ($query) {
                $query->whereDate('date', today())
                    ->orWhereDate('created_at', today());
            })
                ->latest('created_at')
                ->first();
            if ($todaySession) {
                $todayOpname = [
                    'id' => $todaySession->id,
                    'session_number' => $todaySession->opname_number ?? 'OPN-'.substr($todaySession->id, 0, 8),
                    'status' => $todaySession->status,
                    'variance_status' => $todaySession->variance_status,
                    'current_variance_cents' => (int) ($todaySession->current_variance_cents ?? 0),
                    'opname_type' => $todaySession->opname_type ?? 'KAS_KECIL',
                ];
            }
        }

        // Aging vouchers (> 3 days disbursed without settlement)
        $agingVouchersCount = 0;
        $agingVouchersAmountCents = 0;
        if ($storeId) {
            $agingQuery = PettyCashVoucher::where('status', 'DISBURSED')
                ->whereNull('settlement_id')
                ->where('created_at', '<', now()->subDays(3));

            $agingVouchersCount = $agingQuery->count();
            $agingVouchersAmountCents = (int) $agingQuery->sum('amount_cents');
        }

        // Category breakdown of spending for current month
        $categoryBreakdown = [];
        if ($storeId) {
            $monthVouchers = PettyCashVoucher::whereIn('status', ['DISBURSED', 'SETTLED'])
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->get();

            $totalMonthSpentCents = $monthVouchers->sum('amount_cents');

            if ($totalMonthSpentCents > 0) {
                $categoryNames = PettyCashCategory::pluck('name', 'code')->toArray();

                $categoryBreakdown = $monthVouchers
                    ->groupBy('category')
                    ->map(function ($items, $categoryCode) use ($totalMonthSpentCents, $categoryNames) {
                        $amount = $items->sum('amount_cents');
                        $name = $categoryNames[$categoryCode] ?? ($categoryCode ?: 'Lain-lain');

                        return [
                            'code' => $categoryCode,
                            'category' => $name,
                            'amount_cents' => (int) $amount,
                            'percentage' => (int) round(($amount / $totalMonthSpentCents) * 100),
                        ];
                    })
                    ->sortByDesc('amount_cents')
                    ->take(5)
                    ->values()
                    ->toArray();
            }
        }

        // SOA specific: My Recent Vouchers and Status Summary
        $myRecentVouchers = [];
        $myVouchersSummary = [
            'approved_ready' => 0,
            'in_review' => 0,
            'rejected' => 0,
        ];
        if ($user->hasRole('SOA')) {
            $myRecentVouchers = PettyCashVoucher::where('requester_id', $user->id)
                ->latest('created_at')
                ->limit(4)
                ->get()
                ->map(fn ($v) => [
                    'id' => $v->id,
                    'voucher_number' => $v->voucher_number,
                    'purpose' => $v->purpose,
                    'amount_cents' => (int) $v->amount_cents,
                    'status' => $v->status,
                    'rejection_reason' => $v->rejection_reason,
                    'created_at' => $v->created_at->translatedFormat('d M Y, H:i'),
                ])
                ->toArray();

            $myVouchersSummary['approved_ready'] = PettyCashVoucher::where('requester_id', $user->id)
                ->whereIn('status', ['APPROVED', 'APPROVED_SS'])
                ->count();

            $myVouchersSummary['in_review'] = PettyCashVoucher::where('requester_id', $user->id)
                ->whereIn('status', ['SUBMITTED', 'PENDING_SS'])
                ->count();

            $myVouchersSummary['rejected'] = PettyCashVoucher::where('requester_id', $user->id)
                ->where('status', 'REJECTED')
                ->count();
        }

        return Inertia::render('Dashboard', [
            'dashboardData' => [
                'imprest_cents' => $imprestCents,
                'pending_vouchers_count' => $pendingVouchersCount,
                'pending_outflows_count' => $pendingOutflowsCount,
                'last_opname' => $lastOpname,
                'recent_activity' => $recentActivity,
                'disbursed_pending_settlement_cents' => $disbursedPendingSettlementCents,
                'estimated_physical_cash_cents' => $estimatedPhysicalCashCents,
                'burn_rate_percentage' => $burnRatePercentage,
                'today_opname' => $todayOpname,
                'aging_vouchers_count' => $agingVouchersCount,
                'aging_vouchers_amount_cents' => $agingVouchersAmountCents,
                'category_breakdown' => $categoryBreakdown,
                'my_recent_vouchers' => $myRecentVouchers,
                'my_vouchers_summary' => $myVouchersSummary,
            ],
        ]);
    }
}
