<?php

namespace App\Http\Controllers;

use App\Actions\Voucher\ApproveVoucherAction;
use App\Actions\Voucher\BatchSettleVouchersAction;
use App\Actions\Voucher\CancelVoucherAction;
use App\Actions\Voucher\CreateVoucherAction;
use App\Actions\Voucher\DeleteVoucherAction;
use App\Actions\Voucher\DisburseVoucherAction;
use App\Actions\Voucher\RefundVoucherAction;
use App\Actions\Voucher\RejectVoucherAction;
use App\Actions\Voucher\SubmitVoucherAction;
use App\Exports\VoucherRecapExport;
use App\Http\Requests\Voucher\BatchSettleVoucherRequest;
use App\Http\Requests\Voucher\RejectVoucherRequest;
use App\Http\Requests\Voucher\StoreVoucherRequest;
use App\Models\PettyCashVoucher;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class VoucherController extends Controller
{
    /**
     * Export petty cash vouchers to Excel (.xlsx) (FR-RPT-03).
     */
    public function export(Request $request): BinaryFileResponse
    {
        Gate::authorize('export', PettyCashVoucher::class);

        $store = $request->user()->store;
        $storeCode = $store?->code ?? 'STORE';
        $filters = $request->only(['status', 'category', 'requester_id', 'date_from', 'date_to', 'search']);

        $filename = "Voucher-Recap-{$storeCode}-".now()->format('Ymd-His').'.xlsx';

        return Excel::download(new VoucherRecapExport($request->user()->store_id, $filters), $filename);
    }

    /**
     * Display a paginated listing of petty cash vouchers with filters.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', PettyCashVoucher::class);

        $currentUser = $request->user();
        $query = PettyCashVoucher::with(['requester', 'approvedBy', 'disbursedBy'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('requester_id')) {
            $query->where('requester_id', $request->input('requester_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('voucher_number', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%");
            });
        }

        $vouchers = $query->paginate(20)->withQueryString();

        $requesters = User::where('store_id', $currentUser->store_id)
            ->where('is_active', true)
            ->select('id', 'name', 'nik', 'role')
            ->get();

        return Inertia::render('Voucher/Index', [
            'vouchers' => $vouchers,
            'filters' => $request->only(['status', 'category', 'requester_id', 'date_from', 'date_to', 'search']),
            'categories' => PettyCashVoucher::CATEGORIES,
            'requesters' => $requesters,
        ]);
    }

    /**
     * Show the form for creating a new voucher.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', PettyCashVoucher::class);

        $currentUser = $request->user();
        $imprestFundCents = 500000000;

        if ($currentUser->store_id) {
            $config = StoreOpnameConfig::where('store_id', $currentUser->store_id)
                ->where('opname_type', 'KAS_KECIL')
                ->first();
            if ($config) {
                $imprestFundCents = $config->imprest_fund_cents;
            }
        }

        return Inertia::render('Voucher/Create', [
            'categories' => PettyCashVoucher::CATEGORIES,
            'imprestFundCents' => $imprestFundCents,
        ]);
    }

    /**
     * Store a newly created voucher.
     */
    public function store(StoreVoucherRequest $request, CreateVoucherAction $action): RedirectResponse
    {
        $data = $request->validated();
        if ($request->hasFile('receipt_image')) {
            $data['receipt_image'] = $request->file('receipt_image');
        }
        if ($request->hasFile('item_photo')) {
            $data['item_photo'] = $request->file('item_photo');
        }

        $voucher = $action->execute($data, $request->user(), $request->ip());

        $message = $voucher->status === PettyCashVoucher::STATUS_SUBMITTED
            ? "Voucher {$voucher->voucher_number} berhasil diajukan untuk ditinjau."
            : "Voucher {$voucher->voucher_number} berhasil disimpan sebagai draft.";

        return redirect()->route('vouchers.show', $voucher)->with('success', $message);
    }

    /**
     * Display the specified voucher with relations, timeline, and capabilities.
     */
    public function show(Request $request, PettyCashVoucher $voucher): Response
    {
        Gate::authorize('view', $voucher);

        $currentUser = $request->user();

        $voucher->load([
            'store',
            'requester',
            'approvedBy',
            'disbursedBy',
            'attachments',
            'auditLogs.performedBy',
        ]);

        return Inertia::render('Voucher/Show', [
            'voucher' => $voucher,
            'can' => [
                'update' => $currentUser->can('update', $voucher),
                'delete' => $currentUser->can('delete', $voucher),
                'submit' => $currentUser->can('submit', $voucher),
                'approve' => $currentUser->can('approve', $voucher),
                'reject' => $currentUser->can('reject', $voucher),
                'disburse' => $currentUser->can('disburse', $voucher),
                'settle' => $currentUser->can('settle', $voucher),
                'cancel' => $currentUser->can('cancel', $voucher),
                'refund' => $currentUser->can('refund', $voucher),
            ],
        ]);
    }

    /**
     * Remove (soft delete) the specified voucher draft.
     */
    public function destroy(Request $request, PettyCashVoucher $voucher, DeleteVoucherAction $action): RedirectResponse
    {
        Gate::authorize('delete', $voucher);

        $action->execute($voucher, $request->user(), $request->ip());

        return redirect()->route('vouchers.index')->with('success', 'Draft voucher berhasil dihapus.');
    }

    /**
     * Submit draft voucher for review.
     */
    public function submit(Request $request, PettyCashVoucher $voucher, SubmitVoucherAction $action): RedirectResponse
    {
        Gate::authorize('submit', $voucher);

        $action->execute($voucher, $request->user(), $request->ip());

        return redirect()->route('vouchers.show', $voucher)->with('success', 'Voucher berhasil diajukan untuk ditinjau.');
    }

    /**
     * Approve a submitted voucher.
     */
    public function approve(Request $request, PettyCashVoucher $voucher, ApproveVoucherAction $action): RedirectResponse
    {
        Gate::authorize('approve', $voucher);

        $action->execute($voucher, $request->user(), $request->ip());

        return redirect()->route('vouchers.show', $voucher)->with('success', 'Voucher berhasil disetujui.');
    }

    /**
     * Reject a voucher.
     */
    public function reject(RejectVoucherRequest $request, PettyCashVoucher $voucher, RejectVoucherAction $action): RedirectResponse
    {
        Gate::authorize('reject', $voucher);

        $action->execute($voucher, $request->validated('reason'), $request->user(), $request->ip());

        return redirect()->route('vouchers.show', $voucher)->with('success', 'Voucher berhasil ditolak.');
    }

    /**
     * Disburse cash for an approved voucher (SAC only).
     */
    public function disburse(Request $request, PettyCashVoucher $voucher, DisburseVoucherAction $action): RedirectResponse
    {
        Gate::authorize('disburse', $voucher);

        $action->execute($voucher, $request->user(), $request->ip());

        return redirect()->route('vouchers.show', $voucher)->with('success', 'Kas kecil berhasil dicairkan.');
    }

    /**
     * Cancel voucher post-disbursement.
     */
    public function cancel(RejectVoucherRequest $request, PettyCashVoucher $voucher, CancelVoucherAction $action): RedirectResponse
    {
        Gate::authorize('cancel', $voucher);

        $action->execute($voucher, $request->validated('reason'), $request->user(), $request->ip());

        return redirect()->route('vouchers.show', $voucher)->with('warning', 'Voucher dibatalkan. Menunggu pengembalian dana fisik ke kasir.');
    }

    /**
     * Confirm refund of cash (SAC only).
     */
    public function refund(Request $request, PettyCashVoucher $voucher, RefundVoucherAction $action): RedirectResponse
    {
        Gate::authorize('refund', $voucher);

        $action->execute($voucher, $request->user(), $request->ip());

        return redirect()->route('vouchers.show', $voucher)->with('success', 'Pengembalian kas telah dikonfirmasi.');
    }

    /**
     * Display pending approvals queue for SS / SAC / SM.
     */
    public function pending(Request $request): Response
    {
        $currentUser = $request->user();

        $query = PettyCashVoucher::with('requester')
            ->where('status', PettyCashVoucher::STATUS_SUBMITTED)
            ->latest();

        $vouchers = $query->paginate(20)->withQueryString();

        return Inertia::render('Voucher/Pending', [
            'vouchers' => $vouchers,
            'currentUserId' => $currentUser->id,
            'currentUserRole' => $currentUser->role,
        ]);
    }

    /**
     * Display disbursed vouchers ready for settlement (SAC only).
     */
    public function settlement(Request $request): Response
    {
        $currentUser = $request->user();
        if ($currentUser->role !== 'SAC' && $currentUser->role !== 'SYSTEM_ADMIN') {
            abort(403, 'Hanya SAC yang dapat mengakses halaman penyelesaian voucher.');
        }

        $vouchers = PettyCashVoucher::with(['requester', 'approvedBy', 'disbursedBy'])
            ->where('status', PettyCashVoucher::STATUS_DISBURSED)
            ->latest('disbursed_at')
            ->get();

        return Inertia::render('Voucher/Settlement', [
            'vouchers' => $vouchers,
        ]);
    }

    /**
     * Batch settle multiple disbursed vouchers.
     */
    public function batchSettle(BatchSettleVoucherRequest $request, BatchSettleVouchersAction $action): RedirectResponse
    {
        $settled = $action->execute($request->validated('voucher_ids'), $request->user(), $request->ip());

        return redirect()->route('vouchers.settlement')->with(
            'success',
            "{$settled->count()} voucher berhasil diselesaikan (settled)."
        );
    }
}
