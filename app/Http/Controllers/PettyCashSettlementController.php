<?php

namespace App\Http\Controllers;

use App\Exports\PettyCashMatrixRecapExport;
use App\Models\PettyCashCategory;
use App\Models\PettyCashSettlement;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PettyCashSettlementController extends Controller
{
    /**
     * Display a listing of settlement recaps.
     */
    public function index(Request $request): Response
    {
        $currentUser = $request->user();

        $query = PettyCashSettlement::with(['settledBy:id,name,nik'])
            ->withCount('vouchers')
            ->latest('created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('settlement_number', 'like', "%{$search}%");
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $settlements = $query->paginate(15)->withQueryString();

        return Inertia::render('Voucher/SettlementIndex', [
            'settlements' => $settlements,
            'filters' => $request->only(['search', 'date_from', 'date_to']),
        ]);
    }

    /**
     * Display the specified settlement recap with matrix columnar data.
     */
    public function show(Request $request, PettyCashSettlement $settlement): Response
    {
        $settlement->load([
            'store',
            'settledBy',
            'vouchers' => function ($q) {
                $q->with('requester:id,name,nik')->orderBy('disbursed_at')->orderBy('created_at');
            },
        ]);

        $dbCategories = PettyCashCategory::forStore($settlement->store_id)
            ->active()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['code', 'name', 'sort_order']);

        $categoryMap = [];
        foreach ($dbCategories as $cat) {
            $categoryMap[$cat->code] = [
                'code' => $cat->code,
                'name' => $cat->name,
            ];
        }

        // Include any categories present in vouchers
        foreach ($settlement->vouchers as $v) {
            if (! isset($categoryMap[$v->category])) {
                $categoryMap[$v->category] = [
                    'code' => $v->category,
                    'name' => $v->category,
                ];
            }
        }

        $orderedCategories = array_values($categoryMap);

        // Find store manager for signature block
        $storeManager = User::where('store_id', $settlement->store_id)
            ->where('role', 'SM')
            ->first(['id', 'name', 'nik', 'role']);

        return Inertia::render('Voucher/SettlementDetail', [
            'settlement' => $settlement,
            'categories' => $orderedCategories,
            'storeManager' => $storeManager,
        ]);
    }

    /**
     * Export settlement recap to Excel matrix format.
     */
    public function exportExcel(Request $request, PettyCashSettlement $settlement): BinaryFileResponse
    {
        $cleanNumber = str_replace(['/', '\\'], '-', $settlement->settlement_number);
        $filename = "Rekap-Kas-Kecil-{$cleanNumber}.xlsx";

        return Excel::download(new PettyCashMatrixRecapExport($settlement), $filename);
    }
}
