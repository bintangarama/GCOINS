<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\CashOpnameSession;
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
                    'session_number' => $session->session_number,
                    'status' => $session->status,
                    'variance_status' => $session->variance_status,
                    'date' => $session->created_at->toDateString(),
                    'date_formatted' => $session->created_at->translatedFormat('d M Y'),
                ];
            }
        }

        // Recent activity feed (last 10 audit logs for this store)
        $recentActivity = [];
        if ($storeId) {
            $recentActivity = AuditLog::where('store_id', $storeId)
                ->with('performedBy:id,name,nik')
                ->latest('created_at')
                ->limit(10)
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

        return Inertia::render('Dashboard', [
            'dashboardData' => [
                'imprest_cents' => $imprestCents,
                'pending_vouchers_count' => $pendingVouchersCount,
                'pending_outflows_count' => $pendingOutflowsCount,
                'last_opname' => $lastOpname,
                'recent_activity' => $recentActivity,
            ],
        ]);
    }
}
