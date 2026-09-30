# 09 — System Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS (1 CPU / 2 GB RAM)                    │
│                     Ubuntu 22.04 LTS                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Nginx (Reverse Proxy)                                  │  │
│  │  ├── SSL termination (Let's Encrypt)                    │  │
│  │  ├── gcoins.example.com → unix:/run/php-fpm.sock        │  │
│  │  ├── /storage/app/public → static file serve            │  │
│  │  └── client_max_body_size 2M                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  PHP-FPM 8.3 (3 workers, ~60MB each)                    │  │
│  │  └── Laravel 13 Application                             │  │
│  │      ├── Inertia.js (server adapter)                    │  │
│  │      ├── Eloquent ORM                                   │  │
│  │      ├── Spatie Permission (RBAC)                       │  │
│  │      ├── Spatie Activitylog (audit)                     │  │
│  │      ├── Maatwebsite/Excel (export/import)              │  │
│  │      ├── Laravel Storage (file handling)                │  │
│  │      └── Session: database driver (SQLite)              │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SQLite Database (WAL mode)                             │  │
│  │  ├── database/gcoins.sqlite (~0 MB overhead)            │  │
│  │  ├── PRAGMA journal_mode = WAL                          │  │
│  │  ├── PRAGMA busy_timeout = 5000                         │  │
│  │  ├── PRAGMA synchronous = NORMAL                        │  │
│  │  ├── PRAGMA cache_size = -20000 (20MB)                  │  │
│  │  └── PRAGMA foreign_keys = ON                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Supervisor                                             │  │
│  │  └── Laravel Queue Worker (database driver)             │  │
│  │      ├── Excel generation (background)                  │  │
│  │      ├── Notification dispatching                       │  │
│  │      └── Audit log writing (async if needed)            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Memory Budget:                                              │
│  ├── OS + Nginx:          ~200 MB                           │
│  ├── PHP-FPM (3 workers):  ~180 MB                          │
│  ├── SQLite:               ~20 MB (cache only)              │
│  ├── Queue Worker:          ~60 MB                          │
│  ├── Available Buffer:    ~1,540 MB                         │
│  └── Total Used:           ~460 MB / 2,048 MB ✅            │
└─────────────────────────────────────────────────────────────┘
```

## 2. Application Architecture (Laravel)

### Pattern: Action Classes

Each business operation is encapsulated in a single-responsibility Action class:

```
app/
├── Actions/
│   ├── Auth/
│   │   ├── LoginAction.php
│   │   ├── LogoutAction.php
│   │   └── ChangePinAction.php
│   ├── Voucher/
│   │   ├── CreateVoucherAction.php
│   │   ├── SubmitVoucherAction.php
│   │   ├── ApproveVoucherAction.php
│   │   ├── RejectVoucherAction.php
│   │   ├── DisburseVoucherAction.php
│   │   ├── BatchSettleVouchersAction.php
│   │   └── RefundVoucherAction.php
│   ├── Opname/
│   │   ├── OpenSessionAction.php
│   │   ├── UpdateDenominationsAction.php
│   │   ├── UpdateBriSubledgerAction.php
│   │   ├── SubmitSessionAction.php
│   │   ├── VerifySessionAction.php
│   │   └── SignOffSessionAction.php
│   ├── BriFund/
│   │   ├── CreatePostingAction.php
│   │   ├── ApproveOutflowAction.php
│   │   └── RejectOutflowAction.php
│   └── User/
│       ├── CreateUserAction.php
│       └── DeactivateUserAction.php
├── Http/
│   ├── Controllers/
│   │   ├── Auth/
│   │   ├── VoucherController.php
│   │   ├── OpnameController.php
│   │   ├── BriFundController.php
│   │   ├── UserController.php
│   │   ├── NotificationController.php
│   │   ├── AuditLogController.php
│   │   └── ImportExportController.php
│   ├── Middleware/
│   │   └── EnsureStoreScope.php
│   └── Requests/
│       ├── Voucher/
│       ├── Opname/
│       └── BriFund/
├── Models/
│   ├── Store.php
│   ├── StoreOpnameConfig.php
│   ├── OpnameItemDefinition.php
│   ├── User.php
│   ├── CashOpnameSession.php
│   ├── OpnameItemCount.php
│   ├── BriSubLedger.php
│   ├── BriCustomAllocation.php
│   ├── BriFundPosting.php
│   ├── PettyCashVoucher.php
│   ├── AuditLog.php
│   ├── Attachment.php
│   └── Notification.php
├── Scopes/
│   └── StoreScope.php
├── Policies/
│   ├── VoucherPolicy.php
│   ├── OpnameSessionPolicy.php
│   └── BriFundPostingPolicy.php
└── Exports/
    ├── BacoExport.php
    └── VoucherRecapExport.php
```

### Why Action Classes?

1. **Single Responsibility**: Each action does exactly one thing
2. **Testable**: Easy to unit test individual business operations
3. **AI-Friendly**: AI agent can understand and modify one action without affecting others
4. **Business Rules**: All invariants (anti self-approval, anti-minus, etc.) live in the action, not in the controller
5. **Reusable**: Actions can be called from controllers, commands, or queued jobs

## 3. Multi-Tenancy Architecture

```
Request Flow:
1. User authenticates → session contains user_id
2. Middleware resolves user → gets store_id
3. StoreScope automatically applied to all queries
4. All data reads/writes scoped to user's store

Model Implementation:
- Trait: HasStoreScope
- Global Scope: StoreScope (auto WHERE store_id = ?)
- Middleware: EnsureStoreScope (sets current store in app context)
- SYSTEM_ADMIN: scope is bypassed for read operations only
```

## 4. File Storage Architecture

```
storage/
└── app/
    └── public/
        └── uploads/
            ├── vouchers/
            │   └── {store_code}/
            │       └── {YYYY}/{MM}/
            │           ├── PCV-001-receipt.webp
            │           └── PCV-001-item.webp
            ├── bank_proofs/
            │   └── {store_code}/
            │       └── {YYYY}/{MM}/
            │           └── slip-inflow-001.webp
            ├── opname/
            │   └── {store_code}/
            │       └── {YYYY}/{MM}/
            │           ├── statement-scan.webp
            │           └── signed-ba-scan.webp
            └── exports/
                └── {store_code}/
                    └── {YYYY}/{MM}/
                        ├── BACO-001-KKCL-10435-IX-2026.xlsx
                        └── BACO-001-KKCL-10435-IX-2026.pdf
```

- Files organized by store code, year, and month
- Symlink: `php artisan storage:link` → `public/storage` → `storage/app/public`
- Nginx serves static files directly from `/storage/` path

## 5. Frontend Architecture (React + Inertia)

```
resources/
├── js/
│   ├── app.tsx                    # Inertia app entry
│   ├── types/                     # TypeScript type definitions
│   │   ├── index.d.ts
│   │   ├── models.ts              # DB model types (auto-generated from Laravel)
│   │   └── enums.ts               # Status, role, category enums
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      # Main layout (sidebar + topbar)
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── shared/
│   │   │   ├── DataTable.tsx      # Reusable data table
│   │   │   ├── StatusBadge.tsx    # Status color badges
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── ImageCompressor.tsx # Client-side WebP compression
│   │   │   └── MoneyInput.tsx     # Rupiah-formatted input
│   │   └── domain/
│   │       ├── voucher/
│   │       ├── opname/
│   │       └── bri-fund/
│   ├── pages/
│   │   ├── Auth/
│   │   │   └── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Voucher/
│   │   │   ├── Index.tsx
│   │   │   ├── Create.tsx
│   │   │   ├── Show.tsx
│   │   │   ├── PendingApprovals.tsx
│   │   │   └── Settlement.tsx
│   │   ├── Opname/
│   │   │   ├── Index.tsx
│   │   │   ├── Active.tsx
│   │   │   ├── Show.tsx
│   │   │   ├── Verify.tsx
│   │   │   ├── SignOff.tsx
│   │   │   └── Report.tsx
│   │   ├── BriFund/
│   │   │   ├── Overview.tsx
│   │   │   ├── Postings.tsx
│   │   │   ├── Create.tsx
│   │   │   ├── PendingOutflows.tsx
│   │   │   └── EntityDetail.tsx
│   │   ├── Admin/
│   │   │   ├── Users.tsx
│   │   │   ├── StoreSettings.tsx
│   │   │   ├── AuditLogs.tsx
│   │   │   └── ImportExport.tsx
│   │   ├── Notifications.tsx
│   │   └── Profile.tsx
│   ├── hooks/
│   │   ├── useMoneyFormat.ts
│   │   ├── useImageCompression.ts
│   │   └── useNotifications.ts
│   └── lib/
│       ├── utils.ts
│       ├── money.ts               # Cents ↔ display conversion
│       └── validators.ts          # Zod schemas
├── css/
│   └── app.css                    # Tailwind + custom styles
└── views/
    └── app.blade.php              # Inertia root template
```

## 6. Backup Strategy

```bash
# Daily cron job (via supervisor or crontab)
# Backup SQLite database file
0 2 * * * cp /path/to/gcoins.sqlite /path/to/backups/gcoins-$(date +\%Y\%m\%d).sqlite

# Keep last 30 days
0 3 * * * find /path/to/backups/ -name "gcoins-*.sqlite" -mtime +30 -delete

# Backup uploads directory (weekly)
0 4 * * 0 tar -czf /path/to/backups/uploads-$(date +\%Y\%m\%d).tar.gz /path/to/storage/app/public/uploads/
```
