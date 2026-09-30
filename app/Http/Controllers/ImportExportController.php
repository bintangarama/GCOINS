<?php

namespace App\Http\Controllers;

use App\Actions\Import\ImportBriPostingsAction;
use App\Actions\Import\ImportUsersAction;
use App\Actions\Import\ImportVouchersAction;
use App\Exports\AuditLogsExport;
use App\Exports\BriPostingSummaryExport;
use App\Exports\Templates\BriPostingsImportTemplate;
use App\Exports\Templates\UsersImportTemplate;
use App\Exports\Templates\VouchersImportTemplate;
use App\Exports\UsersExport;
use App\Exports\VoucherRecapExport;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ImportExportController extends Controller
{
    /**
     * Display the Import/Export Center.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403, __('Anda tidak memiliki hak akses ke Pusat Import/Export.'));
        }

        $store = $user->store ?? Store::first();

        return Inertia::render('Admin/ImportExport', [
            'store' => $store,
        ]);
    }

    /**
     * Export users as Excel or CSV.
     */
    public function exportUsers(Request $request): BinaryFileResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403);
        }

        $storeId = $user->role !== 'SYSTEM_ADMIN' ? $user->store_id : $request->query('store_id');
        $format = $request->query('format', 'xlsx');
        $fileName = 'Data-Users-'.now()->format('Ymd-His').'.'.$format;

        return (new UsersExport(storeId: $storeId))->download($fileName);
    }

    /**
     * Export vouchers recap as Excel.
     */
    public function exportVouchers(Request $request): BinaryFileResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403);
        }

        $storeId = $user->store_id ?? Store::first()->id;
        $fileName = 'Rekap-Voucher-'.now()->format('Ymd-His').'.xlsx';

        return (new VoucherRecapExport(
            storeId: $storeId,
            status: $request->query('status'),
            category: $request->query('category'),
            startDate: $request->query('start_date'),
            endDate: $request->query('end_date')
        ))->download($fileName);
    }

    /**
     * Export BRI fund postings summary as Excel.
     */
    public function exportBriPostings(Request $request): BinaryFileResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403);
        }

        $storeId = $user->store_id ?? Store::first()->id;
        $fileName = 'Rekap-BRI-Postings-'.now()->format('Ymd-His').'.xlsx';

        return (new BriPostingSummaryExport(
            storeId: $storeId,
            category: $request->query('category'),
            startDate: $request->query('start_date'),
            endDate: $request->query('end_date')
        ))->download($fileName);
    }

    /**
     * Export audit logs as Excel.
     */
    public function exportAuditLogs(Request $request): BinaryFileResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403);
        }

        $storeId = $user->role !== 'SYSTEM_ADMIN' ? $user->store_id : $request->query('store_id');
        $fileName = 'Audit-Logs-'.now()->format('Ymd-His').'.xlsx';

        return (new AuditLogsExport(storeId: $storeId))->download($fileName);
    }

    /**
     * Download Excel import template.
     */
    public function downloadTemplate(string $type): BinaryFileResponse
    {
        return match ($type) {
            'users' => (new UsersImportTemplate)->download('Template-Import-Users.xlsx'),
            'vouchers' => (new VouchersImportTemplate)->download('Template-Import-Vouchers.xlsx'),
            'bri-postings' => (new BriPostingsImportTemplate)->download('Template-Import-Mutasi-BRI.xlsx'),
            default => abort(404, __('Template tidak ditemukan.')),
        };
    }

    /**
     * Preview uploaded spreadsheet data before commit.
     */
    public function preview(
        Request $request,
        ImportUsersAction $usersAction,
        ImportVouchersAction $vouchersAction,
        ImportBriPostingsAction $briAction
    ): JsonResponse {
        $user = $request->user();
        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403);
        }

        $request->validate([
            'type' => ['required', 'string', 'in:users,vouchers,bri-postings'],
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'], // Max 5MB
        ], [
            'file.required' => __('File spreadsheet wajib diunggah.'),
            'file.mimes' => __('Format file harus berupa .xlsx, .xls, atau .csv.'),
            'file.max' => __('Ukuran file maksimal 5MB.'),
        ]);

        $type = $request->input('type');
        $file = $request->file('file');
        $filePath = $file->getRealPath();

        $store = $user->store ?? Store::first();

        $result = match ($type) {
            'users' => $usersAction->preview($filePath, $store),
            'vouchers' => $vouchersAction->preview($filePath, $store),
            'bri-postings' => $briAction->preview($filePath, $store),
        };

        return response()->json($result);
    }

    /**
     * Commit validated rows to the database.
     */
    public function commit(
        Request $request,
        ImportUsersAction $usersAction,
        ImportVouchersAction $vouchersAction,
        ImportBriPostingsAction $briAction
    ): RedirectResponse {
        $user = $request->user();
        if (! in_array($user->role, ['SAC', 'SM', 'SYSTEM_ADMIN'])) {
            abort(403);
        }

        $request->validate([
            'type' => ['required', 'string', 'in:users,vouchers,bri-postings'],
            'valid_rows' => ['required', 'array', 'min:1'],
        ], [
            'valid_rows.required' => __('Tidak ada data valid yang dapat diimpor.'),
            'valid_rows.min' => __('Minimal 1 data valid untuk melakukan impor.'),
        ]);

        $type = $request->input('type');
        $validRows = $request->input('valid_rows');
        $store = $user->store ?? Store::first();

        $count = match ($type) {
            'users' => $usersAction->commit($validRows, $store, $user, $request->ip()),
            'vouchers' => $vouchersAction->commit($validRows, $store, $user, $request->ip()),
            'bri-postings' => $briAction->commit($validRows, $store, $user, $request->ip()),
        };

        return back()->with('success', __(':count data berhasil diimpor ke sistem.', ['count' => $count]));
    }
}
