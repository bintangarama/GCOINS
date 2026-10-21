# 03 — Non-Functional Requirements

## 1. Performance

| Metric | Target |
|---|---|
| Page load time (initial) | < 3 seconds |
| Page navigation (Inertia) | < 1 second |
| Variance calculation | < 100ms (real-time) |
| Excel generation | < 10 seconds |
| Image compression (client) | < 2 seconds per photo |
| Database query response | < 500ms for complex aggregations |
| Concurrent users supported | 10-15 simultaneous |

## 2. Security

### Authentication
- PIN/Password hashed with **bcrypt** (cost factor 12) or **Argon2id**
- Session cookie: HTTP-Only, Secure, SameSite=Lax
- Session TTL: 24 hours, stored in database
- CSRF protection on all state-changing requests (Laravel default)
- Rate limiting on login endpoint: 5 attempts per minute per IP

### Authorization & Segregation of Duties (SoD)
- Role-Based Access Control via Spatie Laravel-Permission
- Every controller action checks permissions and policies before execution
- Anti Self-Approval enforced at service/action layer (not just UI)
- **Segregation of Duties (SoD) & Anti-Escalation**:
  - SAC dilarang membuat, mengedit, atau menugaskan role $\ge$ `SS`.
  - User dilarang memodifikasi rolenya sendiri.
  - SAC dilarang me-reset PIN milik user dengan role `SS`, `SM`, atau `SYSTEM_ADMIN`.
- **Tiered Dual Control & SAC Operational Control**:
  - BRI Outflow: Seluruh penarikan dana baru disetujui seketika (`APPROVED`) saat dicatat oleh SAC di bawah kendali operasional kasir (Rule 6) dengan penegakan *Zero-Deficit Guard* (Rule 7). Pada antrean mutasi lama/legacy (`PENDING_SS`), berlaku Tiered Dual Control: $\le$ Rp 500.000 (SS atau SM), > Rp 500.000 (**SM only**).
  - Variance Write-Off: $\le$ Rp 1.000.000 (SS atau SM), > Rp 1.000.000 (**SM only**).
- Global scope ensures users can only access their store's data (tenant isolation)

### Data Protection
- All financial amounts stored as INTEGER cents (no floating-point)
- HTTPS enforced via Nginx + Let's Encrypt
- File uploads validated for MIME type and size before storage (WebP, JPG, PNG $\le$ 250KB terkompresi; PDF $\le$ 2MB untuk rekening koran)
- SQL injection prevented by Eloquent ORM parameterized queries
- XSS prevented by React's default escaping + Laravel's sanitization

## 3. Availability & Reliability

| Metric | Target |
|---|---|
| Uptime | 99% (allows ~7h downtime/month) |
| Planned maintenance window | Sundays 02:00-05:00 WIB |
| Data backup frequency | Daily SQLite file copy |
| Backup retention | 30 days rolling |
| Recovery Time Objective (RTO) | < 1 hour |
| Recovery Point Objective (RPO) | < 24 hours |

## 4. Data Integrity & Concurrency

- **Immutable snapshots**: Approved opname sessions cannot be modified by any role
- **Outstanding Variance + Resolution Ledger**: Menggantikan formula osilasi lama dengan model buku besar akuntansi ($Outstanding = Raw + Resolved$) yang matematis terbukti stabil dan dapat diaudit penuh
- **SQLite Concurrency & WAL Mode**: SQLite berjalan dengan `journal_mode = WAL`, `busy_timeout = 5000ms`, dan partial unique index (`unique_active_session_per_store_type_date`) untuk mencegah race condition sesi ganda aktif
- **Soft delete**: Deleted drafts retain `deleted_at` for audit purposes
- **Foreign key constraints**: Enforced at database level (`PRAGMA foreign_keys = ON`)
- **Audit trail**: Every financial state change logged with old/new values via Spatie Activitylog
- **Optimistic locking**: Use `updated_at` check to prevent race conditions on approvals

## 5. Scalability

- **Multi-store ready**: `store_id` column scoping from day one
- **Polymorphic Opname Engine**: Mendukung 5 tipe kas opname tanpa skema tabel bercabang
- **Configurable item definitions**: Per-store, per-opname-type
- **Migration path**: SQLite → PostgreSQL if scaling beyond single VPS

## 6. Usability & Human Factors

- **Desktop-first** layout optimized for cashier PC with numpad
- **Numpad Traversal**: Tombol Enter dan Panah Bawah otomatis berpindah dan menyeleksi (`select()`) input berikutnya
- **Debounced Autosave**: Autosave 800ms menjaga kestabilan input kasir tanpa freeze atau form blocking
- **Fully responsive** for mobile (voucher submission & mobile approval SS/SM via phone)
- **Corporate clean** design language
- **Bilingual labels**: Indonesian + English where appropriate
- **Print-ready**: `@media print` CSS for A4 output

## 7. Browser Support

| Browser | Minimum Version |
|---|---|
| Google Chrome | 90+ |
| Microsoft Edge | 90+ |
| Mozilla Firefox | 90+ |
| Safari (iOS) | 15+ |
| Samsung Internet | 15+ |

## 8. File & Media

| Constraint | Value |
|---|---|
| Max upload size (Nginx) | 2 MB |
| Image format (output) | WebP |
| Image max dimensions | 1280 × 1920 px |
| WebP quality factor | 0.75 (75%) |
| Typical compressed size | 120-250 KB |
| Storage location | Local disk (VPS) |

## 9. Deployment

| Aspect | Specification |
|---|---|
| VPS specs | 1 vCPU, 2 GB RAM |
| OS | Ubuntu 22.04 or 24.04 LTS |
| Web server | Nginx (reverse proxy) |
| PHP runtime | PHP-FPM 8.3+ (3 workers) |
| Process manager | Supervisor (queue worker) |
| SSL | Let's Encrypt via Certbot |
| Deploy method | Manual (git pull + artisan commands) |
| Domain | Subdomain on existing domain |
