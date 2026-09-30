<?php

namespace App\Http\Controllers;

use App\Actions\BriFund\ApproveOutflowAction;
use App\Actions\BriFund\CreatePostingAction;
use App\Actions\BriFund\RejectOutflowAction;
use App\Exports\BriPostingSummaryExport;
use App\Http\Requests\BriFund\RejectBriPostingRequest;
use App\Http\Requests\BriFund\StoreBriPostingRequest;
use App\Models\BriFundPosting;
use App\Services\BriBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BriFundController extends Controller
{
    public function __construct(
        protected BriBalanceService $balanceService
    ) {}

    /**
     * Export BRI fund postings summary and running balances to Excel (.xlsx) (FR-RPT-04).
     */
    public function export(Request $request): BinaryFileResponse
    {
        Gate::authorize('export', BriFundPosting::class);

        $store = $request->user()->store;
        $storeCode = $store?->code ?? 'STORE';
        $filters = $request->only(['category', 'entity_name', 'type', 'status', 'date_from', 'date_to', 'search']);

        $filename = "BRI-Summary-{$storeCode}-".now()->format('Ymd-His').'.xlsx';

        return Excel::download(new BriPostingSummaryExport($request->user()->store_id, $filters), $filename);
    }

    /**
     * Display the balance overview dashboard.
     */
    public function overview(Request $request): Response
    {
        Gate::authorize('viewAny', BriFundPosting::class);

        $storeId = $request->user()->store_id;
        $category = $request->query('category');

        $categoryBalances = $this->balanceService->getAllCategoryBalances($storeId);
        $entities = $this->balanceService->getEntitiesWithBalances($storeId, $category);
        $pendingCount = BriFundPosting::pending()->outflow()->count();

        return Inertia::render('BriFund/Overview', [
            'categoryBalances' => $categoryBalances,
            'entities' => $entities,
            'selectedCategory' => $category,
            'pendingCount' => $pendingCount,
        ]);
    }

    /**
     * Display a paginated listing of BRI fund postings with filters.
     */
    public function postings(Request $request): Response
    {
        Gate::authorize('viewAny', BriFundPosting::class);

        $query = BriFundPosting::with(['createdBy', 'approvedBy'])->latest();

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('entity_name')) {
            $query->where('entity_name', $request->input('entity_name'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
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
                $q->where('entity_name', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%");
            });
        }

        $postings = $query->paginate(20)->withQueryString();

        $existingEntities = BriFundPosting::select('entity_name')
            ->distinct()
            ->orderBy('entity_name')
            ->pluck('entity_name');

        return Inertia::render('BriFund/Postings', [
            'postings' => $postings,
            'filters' => $request->only(['category', 'entity_name', 'type', 'status', 'date_from', 'date_to', 'search']),
            'categories' => BriFundPosting::CATEGORIES,
            'entities' => $existingEntities,
        ]);
    }

    /**
     * Show the form for creating a new fund posting.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', BriFundPosting::class);

        $storeId = $request->user()->store_id;
        $entitiesWithBalances = $this->balanceService->getEntitiesWithBalances($storeId);

        return Inertia::render('BriFund/Create', [
            'categories' => BriFundPosting::CATEGORIES,
            'entities' => $entitiesWithBalances,
        ]);
    }

    /**
     * Store a newly created fund posting.
     */
    public function store(StoreBriPostingRequest $request, CreatePostingAction $action): RedirectResponse
    {
        $posting = $action->execute(
            $request->validated(),
            $request->user(),
            $request->ip()
        );

        $msg = $posting->type === BriFundPosting::TYPE_INFLOW
            ? 'Posting pemasukan dana BRI berhasil dicatat dan langsung disetujui.'
            : 'Pengajuan pengeluaran dana BRI berhasil dibuat dan menunggu persetujuan Supervisor.';

        return redirect()->route('bri-funds.postings')->with('success', $msg);
    }

    /**
     * Display pending outflow approvals queue.
     */
    public function pending(Request $request): Response
    {
        Gate::authorize('viewAny', BriFundPosting::class);

        $storeId = $request->user()->store_id;

        $pendingPostings = BriFundPosting::with(['createdBy'])
            ->pending()
            ->outflow()
            ->latest()
            ->get()
            ->map(function ($posting) use ($storeId) {
                $currentBalance = $this->balanceService->getEntityBalance(
                    $storeId,
                    $posting->entity_name,
                    $posting->category
                );

                $posting->current_entity_balance_cents = $currentBalance;
                $posting->is_balance_sufficient = $currentBalance >= $posting->amount_cents;

                return $posting;
            });

        return Inertia::render('BriFund/Pending', [
            'pendingPostings' => $pendingPostings,
        ]);
    }

    /**
     * Approve a pending outflow posting.
     */
    public function approve(BriFundPosting $posting, Request $request, ApproveOutflowAction $action): RedirectResponse
    {
        Gate::authorize('approve', $posting);

        $action->execute($posting, $request->user(), $request->ip());

        return back()->with('success', 'Pengeluaran dana BRI berhasil disetujui.');
    }

    /**
     * Reject a pending outflow posting.
     */
    public function reject(BriFundPosting $posting, RejectBriPostingRequest $request, RejectOutflowAction $action): RedirectResponse
    {
        Gate::authorize('reject', $posting);

        $action->execute(
            $posting,
            $request->user(),
            $request->input('rejection_reason'),
            $request->ip()
        );

        return back()->with('success', 'Pengeluaran dana BRI berhasil ditolak.');
    }

    /**
     * Display drill-down detail for a specific entity.
     */
    public function entityDetail(string $entityName, Request $request): Response
    {
        Gate::authorize('viewAny', BriFundPosting::class);

        $storeId = $request->user()->store_id;

        $runningBalance = $this->balanceService->getEntityBalance($storeId, $entityName);

        $inflowTotal = (int) BriFundPosting::where('entity_name', $entityName)
            ->approved()
            ->inflow()
            ->sum('amount_cents');

        $outflowTotal = (int) BriFundPosting::where('entity_name', $entityName)
            ->approved()
            ->outflow()
            ->sum('amount_cents');

        $postings = BriFundPosting::with(['createdBy', 'approvedBy'])
            ->where('entity_name', $entityName)
            ->latest()
            ->paginate(20);

        $primaryCategory = BriFundPosting::where('entity_name', $entityName)
            ->value('category') ?? 'B2B';

        return Inertia::render('BriFund/EntityDetail', [
            'entityName' => $entityName,
            'category' => $primaryCategory,
            'runningBalanceCents' => $runningBalance,
            'inflowTotalCents' => $inflowTotal,
            'outflowTotalCents' => $outflowTotal,
            'postings' => $postings,
        ]);
    }

    /**
     * Return JSON data for current balances (for Cash Opname auto-population).
     */
    public function balances(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', BriFundPosting::class);

        $storeId = $request->user()->store_id;
        $categoryBalances = $this->balanceService->getAllCategoryBalances($storeId);
        $entities = $this->balanceService->getEntitiesWithBalances($storeId);

        return response()->json([
            'categories' => $categoryBalances,
            'total_allocations_cents' => $categoryBalances['TOTAL'],
            'entities' => $entities,
        ]);
    }
}
