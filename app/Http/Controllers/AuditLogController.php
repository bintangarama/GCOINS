<?php

namespace App\Http\Controllers;

use App\Exports\AuditLogsExport;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AuditLogController extends Controller
{
    /**
     * Display a listing of audit logs.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403, __('Anda tidak memiliki hak akses untuk melihat audit log.'));
        }

        $query = AuditLog::with(['performedBy', 'store'])->latest('created_at');

        // Store scoping: SYSTEM_ADMIN can see all, SAC/SM see their own store
        if ($user->role !== 'SYSTEM_ADMIN') {
            $query->where('store_id', $user->store_id);
        } elseif ($request->filled('store_id')) {
            $query->where('store_id', $request->query('store_id'));
        }

        if ($request->filled('entity_name')) {
            $query->where('entity_name', $request->query('entity_name'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('entity_id', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhereHas('performedBy', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('nik', 'like', "%{$search}%");
                    });
            });
        }

        $logs = $query->paginate(20)->withQueryString();

        // Distinct actions and entity names for filter dropdowns
        $availableActions = AuditLog::select('action')->distinct()->orderBy('action')->pluck('action');
        $availableEntities = AuditLog::select('entity_name')->distinct()->orderBy('entity_name')->pluck('entity_name');

        return Inertia::render('Admin/AuditLogs', [
            'logs' => $logs,
            'filters' => [
                'entity_name' => $request->query('entity_name', ''),
                'action' => $request->query('action', ''),
                'search' => $request->query('search', ''),
                'date_from' => $request->query('date_from', ''),
                'date_to' => $request->query('date_to', ''),
                'store_id' => $request->query('store_id', ''),
            ],
            'availableActions' => $availableActions,
            'availableEntities' => $availableEntities,
        ]);
    }

    /**
     * Export audit logs to Excel.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403, __('Anda tidak memiliki hak akses untuk mengekspor audit log.'));
        }

        $storeId = $user->role !== 'SYSTEM_ADMIN' ? $user->store_id : $request->query('store_id');
        $fileName = 'Audit-Logs-'.now()->format('Ymd-His').'.xlsx';

        return (new AuditLogsExport(
            storeId: $storeId,
            entityName: $request->query('entity_name'),
            action: $request->query('action'),
            search: $request->query('search'),
            dateFrom: $request->query('date_from'),
            dateTo: $request->query('date_to')
        ))->download($fileName);
    }
}
