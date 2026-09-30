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

### Authorization
- Role-Based Access Control via Spatie Laravel-Permission
- Every controller action checks permissions before execution
- Anti Self-Approval enforced at service/action layer (not just UI)
- Dual Control enforced at service/action layer
- Global scope ensures users can only access their store's data

### Data Protection
- All financial amounts stored as INTEGER cents (no floating-point)
- HTTPS enforced via Nginx + Let's Encrypt
- File uploads validated for MIME type and size before storage
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

## 4. Data Integrity

- **Immutable snapshots**: Approved opname sessions cannot be modified by any role
- **Carry-forward chain**: V_current → V_prev link must never break
- **Soft delete**: Deleted drafts retain `deleted_at` for audit purposes
- **Foreign key constraints**: Enforced at database level (`PRAGMA foreign_keys = ON`)
- **Audit trail**: Every financial state change logged with old/new values
- **Optimistic locking**: Use `updated_at` check to prevent race conditions on approvals

## 5. Scalability

- **Multi-store ready**: `store_id` column scoping from day one
- **Configurable opname types**: New types addable without schema changes
- **Configurable item definitions**: Per-store, per-opname-type
- **Migration path**: SQLite → PostgreSQL if scaling beyond single VPS

## 6. Usability

- **Desktop-first** layout optimized for cashier PC with numpad
- **Fully responsive** for mobile (voucher submission via phone)
- **Corporate clean** design language
- **Bilingual labels**: Indonesian + English where appropriate
- **Keyboard navigation**: Enter/Tab on denomination input form
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
