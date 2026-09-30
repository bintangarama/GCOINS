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
| GET | `/login` | `Auth\LoginController@create` | Show login form |
| POST | `/login` | `Auth\LoginController@store` | Authenticate |
| POST | `/logout` | `Auth\LoginController@destroy` | Logout |

### Dashboard
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/dashboard` | `DashboardController@index` | Dashboard page |

### Profile
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/profile` | `ProfileController@edit` | Edit profile page |
| PUT | `/profile/pin` | `ProfileController@updatePin` | Change PIN |

### Vouchers
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/vouchers` | `VoucherController@index` | List with filters |
| GET | `/vouchers/create` | `VoucherController@create` | Create form |
| POST | `/vouchers` | `VoucherController@store` | Save draft/submit |
| GET | `/vouchers/{voucher}` | `VoucherController@show` | Detail view |
| DELETE | `/vouchers/{voucher}` | `VoucherController@destroy` | Soft delete draft |
| POST | `/vouchers/{voucher}/submit` | `VoucherController@submit` | Submit for review |
| POST | `/vouchers/{voucher}/approve` | `VoucherController@approve` | Approve |
| POST | `/vouchers/{voucher}/reject` | `VoucherController@reject` | Reject (reason) |
| POST | `/vouchers/{voucher}/disburse` | `VoucherController@disburse` | Disburse cash |
| POST | `/vouchers/{voucher}/cancel` | `VoucherController@cancel` | Cancel post-disburse |
| POST | `/vouchers/{voucher}/refund` | `VoucherController@refund` | Confirm refund |
| GET | `/vouchers/pending` | `VoucherController@pending` | Approval queue |
| GET | `/vouchers/settlement` | `VoucherController@settlement` | Settlement page |
| POST | `/vouchers/batch-settle` | `VoucherController@batchSettle` | Batch settle |

### Cash Opname
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/opname` | `OpnameController@index` | Session history |
| POST | `/opname/start` | `OpnameController@start` | Open/resume session |
| GET | `/opname/{session}` | `OpnameController@show` | Session detail |
| GET | `/opname/active` | `OpnameController@active` | Active session workspace |
| PUT | `/opname/{session}/denominations` | `OpnameController@updateDenominations` | Save item counts |
| PUT | `/opname/{session}/bri-subledger` | `OpnameController@updateBriSubledger` | Save BRI data |
| POST | `/opname/{session}/submit` | `OpnameController@submit` | Submit to SS |
| POST | `/opname/{session}/verify` | `OpnameController@verify` | SS verification |
| POST | `/opname/{session}/reject-ss` | `OpnameController@rejectSs` | SS reject |
| POST | `/opname/{session}/sign-off` | `OpnameController@signOff` | SM sign-off |
| POST | `/opname/{session}/reject-sm` | `OpnameController@rejectSm` | SM reject |
| GET | `/opname/{session}/report` | `OpnameController@report` | Print view |
| GET | `/opname/{session}/export-excel` | `OpnameController@exportExcel` | Download .xlsx |

### BRI Fund Postings
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/bri-funds` | `BriFundController@overview` | Balance overview |
| GET | `/bri-funds/postings` | `BriFundController@postings` | Posting history |
| GET | `/bri-funds/create` | `BriFundController@create` | Create form |
| POST | `/bri-funds` | `BriFundController@store` | Save posting |
| GET | `/bri-funds/pending` | `BriFundController@pending` | Pending outflows |
| POST | `/bri-funds/{posting}/approve` | `BriFundController@approve` | Approve outflow |
| POST | `/bri-funds/{posting}/reject` | `BriFundController@reject` | Reject outflow |
| GET | `/bri-funds/entity/{entityName}` | `BriFundController@entityDetail` | Entity detail |
| GET | `/bri-funds/balances` | `BriFundController@balances` | JSON: current balances (for opname auto-populate) |

### Administration
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/admin/users` | `UserController@index` | User list |
| POST | `/admin/users` | `UserController@store` | Create user |
| PUT | `/admin/users/{user}` | `UserController@update` | Edit user |
| POST | `/admin/users/{user}/reset-pin` | `UserController@resetPin` | Reset PIN |
| POST | `/admin/users/{user}/toggle-active` | `UserController@toggleActive` | Activate/deactivate |
| GET | `/admin/stores` | `StoreController@edit` | Store settings |
| PUT | `/admin/stores` | `StoreController@update` | Update store config |
| GET | `/admin/audit-logs` | `AuditLogController@index` | Audit log viewer |
| GET | `/admin/import-export` | `ImportExportController@index` | Import/export page |
| POST | `/admin/import` | `ImportExportController@import` | Import data |
| GET | `/admin/export/{type}` | `ImportExportController@export` | Export data |

### Notifications
| Method | URI | Controller | Action |
|---|---|---|---|
| GET | `/notifications` | `NotificationController@index` | All notifications |
| POST | `/notifications/{notification}/read` | `NotificationController@markRead` | Mark as read |
| POST | `/notifications/read-all` | `NotificationController@markAllRead` | Mark all read |
| GET | `/notifications/unread-count` | `NotificationController@unreadCount` | JSON: count |

### File Upload
| Method | URI | Controller | Action |
|---|---|---|---|
| POST | `/upload` | `UploadController@store` | Upload file (returns URL) |

## 4. Validation Rules (Form Requests)

### CreateVoucherRequest
```php
[
    'amount' => 'required|integer|min:1|max:' . $imprestFundCents,
    'purpose' => 'required|string|max:255',
    'category' => 'required|in:OPERASIONAL,STRUK_KASIR,LOGISTIK,KONSUMSI,MAINTENANCE,LAINNYA',
    'receipt_image' => 'nullable|file|mimes:webp,jpg,png|max:2048',
    'item_photo' => 'nullable|file|mimes:webp,jpg,png|max:2048',
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
