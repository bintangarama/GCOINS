# 11 — API Contracts (Controller & Inertia Routes)

> Since we use **Inertia.js**, there are no traditional REST API endpoints. Controllers return `Inertia::render()` for pages and redirect responses for actions. This document defines the controller contracts.

## 1. Response Conventions

### Success (Page Render)
```php
return Inertia::render('Voucher/Show', [
    'voucher' => $voucher->load('requester', 'approver'),
    'canApprove' => $user->can('approve', $voucher),
]);
```

### Success (Action with Redirect)
```php
return redirect()->route('vouchers.show', $voucher)
    ->with('success', 'Voucher berhasil disetujui.');
```

### Validation Error
```php
// Automatic via Form Request — Inertia handles errors natively
// Errors available as `$page.props.errors` in React
```

### Authorization Error
```php
// Via Policy — Laravel returns 403 automatically
// Custom message via abort(403, 'Anda tidak berwenang.')
```

## 2. Standard Error Codes

These are used in flash messages and policy rejections:

| Code | Message |
|---|---|
| `UNAUTHENTICATED` | Silakan login terlebih dahulu |
| `FORBIDDEN_ROLE` | Anda tidak memiliki wewenang untuk aksi ini |
| `FORBIDDEN_SELF_APPROVAL` | Anda tidak dapat menyetujui pengajuan milik sendiri |
| `SESSION_LOCKED` | Sesi opname telah disahkan dan bersifat read-only |
| `VOUCHER_INVALID_STATE` | Status voucher tidak mengizinkan transisi ini |
| `INSUFFICIENT_RUNNING_BALANCE` | Saldo berjalan tidak mencukupi untuk penarikan ini |
| `NOT_FOUND` | Data tidak ditemukan |

## 3. Route Definitions

### Authentication
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/login` | `Auth\AuthController@create` | Show login form |
| POST | `/login` | `Auth\AuthController@store` | Authenticate (throttled) |
| POST | `/logout` | `Auth\AuthController@destroy` | Logout |

### Dashboard
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/dashboard` | `DashboardController` | Main overview dashboard |

### Profile
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/profile` | `ProfileController@show` | View profile and change PIN form |
| PUT | `/profile/pin` | `ProfileController@updatePin` | Update PIN with current PIN verification |

### Vouchers & Settlement Rekap (KKCL)
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/vouchers` | `VoucherController@index` | List with filters |
| GET | `/vouchers/create` | `VoucherController@create` | Create form (loads active categories) |
| POST | `/vouchers` | `VoucherController@store` | Save draft/submit (receipt_date support, receipt guard enforced) |
| GET | `/vouchers/{voucher}` | `VoucherController@show` | Detail view |
| DELETE | `/vouchers/{voucher}` | `VoucherController@destroy` | Soft delete draft |
| POST | `/vouchers/{voucher}/submit` | `VoucherController@submit` | Submit for review |
| POST | `/vouchers/{voucher}/approve` | `VoucherController@approve` | Approve (Anti self-approval enforced) |
| POST | `/vouchers/{voucher}/reject` | `VoucherController@reject` | Reject (reason mandatory) |
| POST | `/vouchers/{voucher}/disburse` | `VoucherController@disburse` | Disburse cash (SAC only) |
| POST | `/vouchers/{voucher}/cancel` | `VoucherController@cancel` | Cancel post-disburse |
| POST | `/vouchers/{voucher}/refund` | `VoucherController@refund` | Confirm refund (SAC only) |
| GET | `/vouchers/pending` | `VoucherController@pending` | Approval queue |
| GET | `/vouchers/settlements` | `PettyCashSettlementController@index` | Settlement archive list |
| POST | `/vouchers/settlements` | `PettyCashSettlementController@store` | Generate KKCL & instant settle |
| GET | `/vouchers/settlements/{settlement}` | `PettyCashSettlementController@show` | Columnar matrix workspace (A4 print) |
| GET | `/vouchers/settlements/{settlement}/export` | `PettyCashSettlementController@export` | Export matrix spreadsheet (.xlsx) |
| GET | `/vouchers/settlement` | `VoucherController@settlement` | Legacy settlement page |
| POST | `/vouchers/batch-settle` | `VoucherController@batchSettle` | Legacy batch settle |
| GET | `/vouchers/export` | `VoucherController@export` | Export filtered vouchers (.xlsx/.csv, col C Tanggal Bon, col N KKCL) |

### Cash Opname, Reference Lines & Resolutions
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/opname` | `OpnameController@index` | Session history |
| POST | `/opname/start` | `OpnameController@start` | Open/resume session (supports `opname_type`) |
| GET | `/opname/active` | `OpnameController@active` | Active session workspace (supports `?type=`) |
| GET | `/opname/{session}` | `OpnameController@show` | Session detail (read-only) |
| PUT | `/opname/{session}/denominations` | `OpnameController@updateDenominations` | Save item counts & conditions |
| PUT | `/opname/{session}/bri-subledger` | `OpnameController@updateBriSubledger` | Save BRI data |
| POST | `/opname/{session}/bri-sync` | `OpnameController@syncBri` | Auto-sync BRI allocations |
| POST | `/opname/{session}/reference-lines` | `OpnameController@storeReferenceLine` | Add Z-Report / deposit / float line |
| DELETE | `/opname/{session}/reference-lines/{referenceLine}` | `OpnameController@destroyReferenceLine` | Delete reference line |
| POST | `/opname/{session}/resolutions` | `OpnameController@storeResolution` | Create resolution (REPLACED/WRITE_OFF/FOUND) |
| POST | `/opname/resolutions/{resolution}/approve` | `OpnameController@approveResolution` | Approve resolution (tier limit enforced) |
| POST | `/opname/resolutions/{resolution}/reject` | `OpnameController@rejectResolution` | Reject resolution (reason mandatory) |
| POST | `/opname/{session}/signed-ba` | `OpnameController@uploadSignedBa` | Upload signed physical BACO |
| POST | `/opname/{session}/submit` | `OpnameController@submit` | Submit to SS (Z-report guard for KAS_BESAR) |
| POST | `/opname/{session}/verify` | `OpnameController@verify` | SS witness verification |
| POST | `/opname/{session}/reject-ss` | `OpnameController@rejectSs` | SS reject to draft |
| POST | `/opname/{session}/sign-off` | `OpnameController@signOff` | SM sign-off (immutable snapshot lock) |
| POST | `/opname/{session}/reject-sm` | `OpnameController@rejectSm` | SM reject to draft |
| GET | `/opname/{session}/report` | `OpnameController@report` | Print-friendly A4 BACO view |
| GET | `/opname/{session}/export-excel` | `OpnameController@exportExcel` | Download BACO Excel .xlsx |

### BRI Fund Postings
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/bri-funds` | `BriFundController@overview` | Balance overview |
| GET | `/bri-funds/postings` | `BriFundController@postings` | Posting history |
| GET | `/bri-funds/create` | `BriFundController@create` | Create form |
| POST | `/bri-funds` | `BriFundController@store` | Save posting |
| GET | `/bri-funds/pending` | `BriFundController@pending` | Pending outflows queue |
| POST | `/bri-funds/{posting}/approve` | `BriFundController@approve` | Approve outflow (tier limit enforced: SS ≤ 500k, SM > 500k) |
| POST | `/bri-funds/{posting}/reject` | `BriFundController@reject` | Reject outflow |
| GET | `/bri-funds/entity/{entityName}` | `BriFundController@entityDetail` | Entity detail drill-down |
| GET | `/bri-funds/balances` | `BriFundController@balances` | JSON: current balances for opname form |
| GET | `/bri-funds/export` | `BriFundController@export` | Export posting summary |

### Master Kategori Kas Kecil (Expense Categories)
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/admin/categories` | `PettyCashCategoryController@index` | Categories catalog list |
| POST | `/admin/categories` | `PettyCashCategoryController@store` | Create category (Scope enforced) |
| PUT | `/admin/categories/{category}` | `PettyCashCategoryController@update` | Update category (Scope protected) |
| POST | `/admin/categories/{category}/toggle-status` | `PettyCashCategoryController@toggleStatus` | Activate / deactivate category |

### Administration & Settings
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/admin/users` | `UserController@index` | User management list |
| POST | `/admin/users` | `UserController@store` | Create user (SoD enforced) |
| PUT | `/admin/users/{user}` | `UserController@update` | Update user (Anti-escalation enforced) |
| POST | `/admin/users/{user}/reset-pin` | `UserController@resetPin` | Reset user PIN (SoD protected) |
| POST | `/admin/users/{user}/toggle-status` | `UserController@toggleStatus` | Activate/deactivate user |
| GET | `/admin/store-settings` | `StoreSettingsController@show` | View store configuration |
| PUT | `/admin/store-settings` | `StoreSettingsController@update` | Update store configuration |
| GET | `/admin/audit-logs` | `AuditLogController@index` | Audit log viewer |
| GET | `/admin/audit-logs/export` | `AuditLogController@export` | Export audit log dataset |

### Import & Export Center
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/admin/import-export` | `ImportExportController@index` | Import/Export workspace |
| GET | `/admin/import-export/export/users` | `ImportExportController@exportUsers` | Export user accounts |
| GET | `/admin/import-export/export/vouchers` | `ImportExportController@exportVouchers` | Export vouchers dataset |
| GET | `/admin/import-export/export/categories` | `ImportExportController@exportCategories` | Export expense categories catalog |
| GET | `/admin/import-export/export/settlements` | `ImportExportController@exportSettlements` | Export settlement recaps |
| GET | `/admin/import-export/export/bri-postings` | `ImportExportController@exportBriPostings` | Export BRI ledger |
| GET | `/admin/import-export/export/audit-logs` | `ImportExportController@exportAuditLogs` | Export activity logs |
| GET | `/admin/import-export/template/{type}` | `ImportExportController@downloadTemplate` | Download multi-sheet Excel template |
| POST | `/admin/import-export/preview` | `ImportExportController@preview` | Validate uploaded Excel (dynamic categories) |
| POST | `/admin/import-export/commit` | `ImportExportController@commit` | Commit validated rows to database |

### Notifications
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/notifications` | `NotificationController@index` | All notifications page |
| POST | `/notifications/{notification}/read` | `NotificationController@markAsRead` | Mark notification as read |
| POST | `/notifications/read-all` | `NotificationController@markAllAsRead` | Mark all notifications as read |
| DELETE | `/notifications/{notification}` | `NotificationController@destroy` | Delete notification |

> **Catatan Media & File Upload**: Tidak ada rute umum `/upload`. Seluruh pengunggahan dokumen (foto nota struk, foto barang, scan rekening koran, foto struk Z-Report, dan scan BACO fisik) dikompresi di sisi klien (WebP $\le$ 250 KB) dan dikirim langsung sebagai *multipart form payload* ke rute entitas masing-masing.

> **Unread Notification Count**: Disediakan secara terpusat oleh server di setiap response Inertia melalui shared props `$page.props.auth.unreadNotificationsCount` via `HandleInertiaRequests` middleware.

## 4. Validation Rules (Form Requests)

### CreateVoucherRequest
```php
[
    'amount' => 'required|integer|min:1|max:' . $imprestFundCents,
    'purpose' => 'required|string|max:255',
    'category' => [
        'required',
        'string',
        'max:50',
        Rule::exists('petty_cash_categories', 'code')->where(function ($query) {
            $query->where('is_active', true)
                ->where(fn ($q) => $q->whereNull('store_id')->orWhere('store_id', auth()->user()->store_id));
        }),
    ],
    'is_submit' => 'nullable|boolean',
    'receipt_image' => [
        Rule::requiredIf(fn () => (bool) request('is_submit')),
        'nullable',
        'file',
        'mimes:webp,jpg,jpeg,png',
        'max:2048',
    ],
    'item_photo' => 'nullable|file|mimes:webp,jpg,jpeg,png|max:2048',
]
```

### StoreSettlementRequest
```php
[
    'voucher_ids' => 'required|array|min:1',
    'voucher_ids.*' => 'required|string|exists:petty_cash_vouchers,id',
    'notes' => 'nullable|string|max:1000',
]
```

### CategoryRequest
```php
[
    'name' => 'required|string|max:100',
    'code' => 'nullable|string|max:50',
    'description' => 'nullable|string|max:255',
    'sort_order' => 'nullable|integer|min:0',
]
```

### UpdateDenominationsRequest
```php
[
    'items' => 'required|array',
    'items.*.item_definition_id' => 'required|exists:opname_item_definitions,id',
    'items.*.count' => 'required|integer|min:0',
]
```

### CreateBriPostingRequest
```php
[
    'category' => 'required|in:B2B,EVENT,AKSEL,ANONYMOUS,CUSTOM',
    'custom_category_name' => 'required_if:category,CUSTOM|max:100',
    'entity_name' => 'required|string|max:150',
    'type' => 'required|in:INFLOW,OUTFLOW',
    'amount' => 'required|integer|min:1',
    'purpose' => 'required|string|max:255',
    'proof_attachment' => 'nullable|file|mimes:webp,jpg,png|max:2048',
]
```

### RejectRequest (shared)
```php
[
    'reason' => 'required|string|max:255',
]
```
