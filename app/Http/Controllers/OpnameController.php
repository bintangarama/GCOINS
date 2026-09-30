<?php

namespace App\Http\Controllers;

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\RejectSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\UpdateBriSubledgerAction;
use App\Actions\Opname\UpdateDenominationsAction;
use App\Actions\Opname\UploadSignedBaScanAction;
use App\Actions\Opname\VerifySessionAction;
use App\Exports\BacoExport;
use App\Http\Requests\Opname\RejectOpnameRequest;
use App\Http\Requests\Opname\SignOffOpnameRequest;
use App\Http\Requests\Opname\UpdateBriSubledgerRequest;
use App\Http\Requests\Opname\UpdateDenominationsRequest;
use App\Http\Requests\Opname\UploadSignedBaRequest;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\PettyCashVoucher;
use App\Services\BriBalanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OpnameController extends Controller
{
    public function __construct(
        protected BriBalanceService $briBalanceService
    ) {}

    /**
     * Display a paginated listing of cash opname sessions with filters.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CashOpnameSession::class);

        $query = CashOpnameSession::with([
            'createdBy:id,name,nik,role',
            'verifiedBySs:id,name,nik,role',
            'approvedBySm:id,name,nik,role',
        ])
            ->latest('date')
            ->latest('created_at');

        if ($request->filled('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('opname_type') && $request->input('opname_type') !== 'ALL') {
            $query->where('opname_type', $request->input('opname_type'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('opname_number', 'like', "%{$search}%");
        }

        $sessions = $query->paginate(15)->withQueryString();

        $user = $request->user();
        $stats = [
            'total_sessions' => CashOpnameSession::count(),
            'approved_count' => CashOpnameSession::where('status', CashOpnameSession::STATUS_APPROVED)->count(),
            'pending_review' => CashOpnameSession::whereIn('status', [
                CashOpnameSession::STATUS_SUBMITTED,
                CashOpnameSession::STATUS_VERIFIED_SS,
            ])->count(),
            'draft_count' => CashOpnameSession::where('status', CashOpnameSession::STATUS_DRAFT)->count(),
        ];

        return Inertia::render('Opname/Index', [
            'sessions' => $sessions,
            'filters' => [
                'status' => $request->input('status', 'ALL'),
                'opname_type' => $request->input('opname_type', 'ALL'),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
                'search' => $request->input('search', ''),
            ],
            'stats' => $stats,
            'canCreate' => $user->can('create', CashOpnameSession::class),
        ]);
    }

    /**
     * Display the active cash opname session workspace.
     */
    public function active(Request $request): Response
    {
        $user = $request->user();
        $storeId = $user->store_id;

        $session = null;
        $disbursedVouchers = [];
        $briCategoryBalances = [
            'B2B' => 0,
            'EVENT' => 0,
            'AKSEL' => 0,
            'ANONYMOUS' => 0,
            'CUSTOM' => 0,
            'TOTAL' => 0,
        ];
        $briEntities = [];

        if ($storeId) {
            $briCategoryBalances = $this->briBalanceService->getAllCategoryBalances($storeId);
            $briEntities = $this->briBalanceService->getEntitiesWithBalances($storeId);

            // First find active pending/draft session
            $session = CashOpnameSession::where('store_id', $storeId)
                ->where('opname_type', CashOpnameSession::TYPE_KAS_KECIL)
                ->whereIn('status', [
                    CashOpnameSession::STATUS_DRAFT,
                    CashOpnameSession::STATUS_SUBMITTED,
                    CashOpnameSession::STATUS_VERIFIED_SS,
                ])
                ->latest()
                ->first();

            // If no active draft/pending session, grab the latest approved session for review/status display
            if (! $session) {
                $session = CashOpnameSession::where('store_id', $storeId)
                    ->where('opname_type', CashOpnameSession::TYPE_KAS_KECIL)
                    ->where('status', CashOpnameSession::STATUS_APPROVED)
                    ->latest('approved_sm_at')
                    ->latest('created_at')
                    ->first();
            }

            if ($session) {
                // Ensure complete item definitions (Rule 8: Auto-heal) only during DRAFT
                if ($session->status === CashOpnameSession::STATUS_DRAFT) {
                    app(OpenSessionAction::class)->autoHealItemCounts($session);
                }

                $session->load([
                    'itemCounts' => function ($q) {
                        $q->join('opname_item_definitions', 'opname_item_counts.item_definition_id', '=', 'opname_item_definitions.id')
                            ->orderBy('opname_item_definitions.sort_order')
                            ->select('opname_item_counts.*');
                    },
                    'itemCounts.itemDefinition',
                    'subLedger.customAllocations',
                    'createdBy',
                    'verifiedBySs',
                    'approvedBySm',
                ]);

                // Outstanding vouchers (Pocket 2: K_bon)
                $disbursedVouchers = PettyCashVoucher::where('store_id', $storeId)
                    ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                    ->with('requester:id,name,nik')
                    ->latest()
                    ->get(['id', 'voucher_number', 'requester_id', 'purpose', 'amount_cents', 'category', 'disbursed_at']);
            }
        }

        return Inertia::render('Opname/Active', [
            'session' => $session,
            'disbursedVouchers' => $disbursedVouchers,
            'briCategoryBalances' => $briCategoryBalances,
            'briEntities' => $briEntities,
            'canManage' => $user->role === 'SAC' && ($session ? $session->status === CashOpnameSession::STATUS_DRAFT : true),
            'permissions' => [
                'canSubmit' => $session ? $user->can('submit', $session) : false,
                'canVerify' => $session ? $user->can('verify', $session) : false,
                'canRejectSs' => $session ? $user->can('rejectSs', $session) : false,
                'canSignOff' => $session ? $user->can('signOff', $session) : false,
                'canRejectSm' => $session ? $user->can('rejectSm', $session) : false,
                'canUpdateDenominations' => $session ? $user->can('updateDenominations', $session) : false,
                'canUpdateBri' => $session ? $user->can('updateBriSubledger', $session) : false,
            ],
        ]);
    }

    /**
     * Open a new opname session or resume draft.
     */
    public function start(Request $request, OpenSessionAction $action): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('create', CashOpnameSession::class);

        $session = $action->execute($user, CashOpnameSession::TYPE_KAS_KECIL, $request->ip());

        return redirect()->route('opname.active')->with('success', "Sesi Cash Opname {$session->opname_number} berhasil dibuka.");
    }

    /**
     * Update denomination counts for the session.
     */
    public function updateDenominations(
        UpdateDenominationsRequest $request,
        CashOpnameSession $session,
        UpdateDenominationsAction $action
    ): RedirectResponse {
        Gate::authorize('updateDenominations', $session);

        $action->execute(
            $session,
            $request->validated('items'),
            $request->user(),
            $request->ip()
        );

        return redirect()->back()->with('success', 'Perhitungan fisik pecahan uang berhasil disimpan.');
    }

    /**
     * Update BRI Sub-Ledger for the session.
     */
    public function updateBriSubledger(
        UpdateBriSubledgerRequest $request,
        CashOpnameSession $session,
        UpdateBriSubledgerAction $action
    ): RedirectResponse {
        Gate::authorize('updateBriSubledger', $session);

        $data = $request->validated();
        if ($request->hasFile('statement_proof')) {
            $data['statement_proof'] = $request->file('statement_proof');
        }

        $action->execute(
            $session,
            $data,
            $request->user(),
            $request->ip()
        );

        return redirect()->back()->with('success', 'Rekonsiliasi mutasi BRI berhasil disimpan.');
    }

    /**
     * Sync BRI category allocations from latest approved fund postings.
     */
    public function syncBri(
        Request $request,
        CashOpnameSession $session,
        UpdateBriSubledgerAction $action
    ): RedirectResponse {
        Gate::authorize('updateBriSubledger', $session);

        $action->execute(
            $session,
            [],
            $request->user(),
            $request->ip()
        );

        return redirect()->back()->with('success', 'Alokasi saldo BRI berhasil disinkronisasi.');
    }

    /**
     * Submit session to SS for witness verification.
     */
    public function submit(
        Request $request,
        CashOpnameSession $session,
        SubmitSessionAction $action
    ): RedirectResponse {
        Gate::authorize('submit', $session);

        $action->execute($session, $request->user(), $request->ip());

        return redirect()->back()->with('success', "Sesi Cash Opname {$session->opname_number} berhasil diajukan untuk verifikasi saksi.");
    }

    /**
     * Witness verification by SS.
     */
    public function verify(
        Request $request,
        CashOpnameSession $session,
        VerifySessionAction $action
    ): RedirectResponse {
        Gate::authorize('verify', $session);

        $action->execute($session, $request->user(), $request->ip());

        return redirect()->back()->with('success', "Sesi Cash Opname {$session->opname_number} berhasil diverifikasi sebagai saksi fisik brankas.");
    }

    /**
     * Reject session by SS back to DRAFT.
     */
    public function rejectSs(
        RejectOpnameRequest $request,
        CashOpnameSession $session,
        RejectSessionAction $action
    ): RedirectResponse {
        Gate::authorize('rejectSs', $session);

        $action->execute($session, $request->validated(), $request->user(), $request->ip());

        return redirect()->back()->with('success', "Sesi Cash Opname {$session->opname_number} berhasil ditolak kembali ke status DRAFT.");
    }

    /**
     * Final sign-off and approval by SM (triggers permanent lock).
     */
    public function signOff(
        SignOffOpnameRequest $request,
        CashOpnameSession $session,
        SignOffSessionAction $action
    ): RedirectResponse {
        Gate::authorize('signOff', $session);

        $action->execute($session, $request->validated(), $request->user(), $request->ip());

        return redirect()->back()->with('success', "Sesi Cash Opname {$session->opname_number} berhasil disetujui (sign-off) dan data telah dikunci permanen.");
    }

    /**
     * Reject session by SM back to DRAFT.
     */
    public function rejectSm(
        RejectOpnameRequest $request,
        CashOpnameSession $session,
        RejectSessionAction $action
    ): RedirectResponse {
        Gate::authorize('rejectSm', $session);

        $action->execute($session, $request->validated(), $request->user(), $request->ip());

        return redirect()->back()->with('success', "Sesi Cash Opname {$session->opname_number} berhasil ditolak kembali ke status DRAFT.");
    }

    /**
     * Show session detail (Read-only view).
     */
    public function show(Request $request, CashOpnameSession $session): Response
    {
        Gate::authorize('view', $session);

        $session->load([
            'itemCounts' => function ($q) {
                $q->join('opname_item_definitions', 'opname_item_counts.item_definition_id', '=', 'opname_item_definitions.id')
                    ->orderBy('opname_item_definitions.sort_order')
                    ->select('opname_item_counts.*');
            },
            'itemCounts.itemDefinition',
            'subLedger.customAllocations',
            'createdBy:id,name,nik,role',
            'verifiedBySs:id,name,nik,role',
            'approvedBySm:id,name,nik,role',
        ]);

        // If session is APPROVED, retrieve immutable snapshot of disbursed vouchers from AuditLog
        $disbursedVouchers = [];
        if ($session->status === CashOpnameSession::STATUS_APPROVED) {
            $audit = AuditLog::where('entity_id', $session->id)
                ->where('action', 'SIGN_OFF_SM')
                ->latest()
                ->first();

            if (! empty($audit?->new_values['snapshot']['vouchers_disbursed'])) {
                $disbursedVouchers = $audit->new_values['snapshot']['vouchers_disbursed'];
            }
        }

        // If not in audit snapshot or not approved, query current disbursed vouchers
        if (empty($disbursedVouchers)) {
            $disbursedVouchers = PettyCashVoucher::where('store_id', $session->store_id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->with('requester:id,name,nik')
                ->latest()
                ->get(['id', 'voucher_number', 'requester_id', 'purpose', 'amount_cents', 'category', 'disbursed_at'])
                ->toArray();
        }

        $user = $request->user();

        return Inertia::render('Opname/Show', [
            'session' => $session,
            'disbursedVouchers' => $disbursedVouchers,
            'briCategoryBalances' => $this->briBalanceService->getAllCategoryBalances($session->store_id),
            'briEntities' => $this->briBalanceService->getEntitiesWithBalances($session->store_id),
            'permissions' => [
                'canSubmit' => $user->can('submit', $session),
                'canVerify' => $user->can('verify', $session),
                'canRejectSs' => $user->can('rejectSs', $session),
                'canSignOff' => $user->can('signOff', $session),
                'canRejectSm' => $user->can('rejectSm', $session),
                'canExportExcel' => $user->can('exportExcel', $session),
                'canViewReport' => $user->can('viewReport', $session),
                'canUploadSignedBa' => $user->can('uploadSignedBa', $session),
            ],
        ]);
    }

    /**
     * Download Berita Acara Cash Opname (BACO) Excel spreadsheet (FR-RPT-01).
     */
    public function exportExcel(Request $request, CashOpnameSession $session): BinaryFileResponse
    {
        Gate::authorize('exportExcel', $session);

        $sanitizedNumber = str_replace(['/', '\\'], '-', $session->opname_number);
        $fileName = "BACO-{$sanitizedNumber}.xlsx";

        return Excel::download(new BacoExport($session), $fileName);
    }

    /**
     * Display print-friendly A4 view of Berita Acara Cash Opname (FR-RPT-02).
     */
    public function report(Request $request, CashOpnameSession $session): Response
    {
        Gate::authorize('viewReport', $session);

        $session->load([
            'store',
            'itemCounts' => function ($q) {
                $q->join('opname_item_definitions', 'opname_item_counts.item_definition_id', '=', 'opname_item_definitions.id')
                    ->orderBy('opname_item_definitions.sort_order')
                    ->select('opname_item_counts.*');
            },
            'itemCounts.itemDefinition',
            'subLedger.customAllocations',
            'createdBy:id,name,nik,role',
            'verifiedBySs:id,name,nik,role',
            'approvedBySm:id,name,nik,role',
        ]);

        $disbursedVouchers = [];
        if ($session->status === CashOpnameSession::STATUS_APPROVED) {
            $audit = AuditLog::where('entity_id', $session->id)
                ->where('action', 'SIGN_OFF_SM')
                ->latest()
                ->first();

            if (! empty($audit?->new_values['snapshot']['vouchers_disbursed'])) {
                $disbursedVouchers = $audit->new_values['snapshot']['vouchers_disbursed'];
            }
        }

        if (empty($disbursedVouchers)) {
            $disbursedVouchers = PettyCashVoucher::where('store_id', $session->store_id)
                ->where('status', PettyCashVoucher::STATUS_DISBURSED)
                ->with('requester:id,name,nik')
                ->latest()
                ->get(['id', 'voucher_number', 'requester_id', 'purpose', 'amount_cents', 'category', 'disbursed_at'])
                ->toArray();
        }

        $user = $request->user();

        return Inertia::render('Opname/Report', [
            'session' => $session,
            'disbursedVouchers' => $disbursedVouchers,
            'permissions' => [
                'canExportExcel' => $user->can('exportExcel', $session),
                'canUploadSignedBa' => $user->can('uploadSignedBa', $session),
            ],
        ]);
    }

    /**
     * Upload physical signed Berita Acara scan (FR-RPT-05).
     */
    public function uploadSignedBa(
        UploadSignedBaRequest $request,
        CashOpnameSession $session,
        UploadSignedBaScanAction $action
    ): RedirectResponse {
        Gate::authorize('uploadSignedBa', $session);

        $action->execute(
            $session,
            $request->file('signed_ba'),
            $request->user(),
            $request->ip()
        );

        return redirect()->back()->with('success', 'Scan Berita Acara fisik bertanda tangan berhasil diunggah.');
    }
}
