# 00 — Project Overview

## Project Identity

| Field | Value |
|---|---|
| **Project Name** | G-COINS (Gramedia Cash Opname Internal System) |
| **Organization** | PT Gramedia Asri Media — Toko Gramedia World Karawang |
| **Store Code** | `10435` |
| **Version** | 2.1.0 (Full 5 Item Opname Engine & Security Hardened) |
| **Document Version** | 1.1.0 |

## Purpose

G-COINS automates the daily cash reconciliation (*cash opname*) process for Gramedia retail stores. It replaces error-prone manual spreadsheet workflows with a high-integrity web application that ensures mathematical precision, complete audit traceability, polymorphic opname engines, and role-based segregation of duties.

## Goals & Success Criteria

1. **Zero floating-point errors** in all financial calculations (using integer cents)
2. **Complete audit trail** for every financial state change
3. **Role-based access control** strictly enforcing segregation of duties (SoD) & anti-escalation
4. **Immutable snapshots** of approved cash opname sessions
5. **Precision accounting**: Outstanding Variance + Resolution Ledger model guaranteeing zero-oscillation across periods
6. **Multi-store ready** architecture with strict store scoping
7. **Full 5 Item Cash Opname Scope**: Polymorphic engine supporting `KAS_KECIL`, `KAS_BESAR`, `ACTIVE_SELLING`, `MATERAI`, and `GIFT_VOUCHER`

## Target Users

| Role | User Type | Device |
|---|---|---|
| SOA (Store Operation Associate) | Store floor staff | Mobile phone |
| SS (Store Supervisor) | Operations supervisor | Mobile / Desktop |
| SAC (Staff Administrative Clerk) | Cashier / Admin | Desktop PC (numpad) |
| SM (Store Manager) | Store leader | Desktop / Mobile |
| SYSTEM_ADMIN | IT / System administrator | Desktop |

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Inertia.js v2/v3, shadcn/ui + Tailwind CSS v4 |
| Backend | Laravel 13 (PHP 8.4+), Eloquent ORM |
| Database | SQLite (WAL mode, INTEGER cents) |
| Auth | Cookie-based session (24h TTL, database driver) |
| RBAC | Spatie Laravel-Permission |
| Audit | Spatie Laravel-Activitylog |
| Excel | Maatwebsite/Excel |
| AI Tooling | Laravel Boost, shadcn Skills |
| Infrastructure | VPS 1CPU/2GB, Nginx, PHP-FPM, Supervisor |

## Scope — Implemented Modules

**Full Production-Ready Scope (5 Item Cash Count Engine):**

Includes:
- Authentication, User Management & Strict Segregation of Duties (SoD)
- Voucher bon kas kecil (full lifecycle with anti self-approval & WebP compression)
- BRI fund posting & sub-ledger with tiered dual control approval (SS ≤ 500rb, SM > 500rb)
- Polymorphic Cash Opname Engine:
  - `KAS_KECIL` (Three Pockets Strategy: Safe Fisik + Bon Gantung + Net BRI Pooling)
  - `KAS_BESAR` (Cash Flow Turnover Strategy: Safe Fisik POS vs Z-Report + Opening Float - Setoran/DRO)
  - `ACTIVE_SELLING` (Event / Mobile Bazar Cash Flow Turnover)
  - `MATERAI` (Consignment Stock Strategy: Keping fisik vs Target Konsinyasi Pos/Vendor)
  - `GIFT_VOUCHER` (Consignment Stock Strategy: Lembar fisik voucher vs Saldo Stok Toko)
- Dynamic Reference Lines (Z-Report, Modal Awal, Setoran Bank/DRO, Mutasi) & physical Z-Report photo proof
- Precision Accounting: Outstanding Variance + Resolution Ledger (`REPLACED`, `WRITE_OFF`, `FOUND`) with tiered write-off approval (SS ≤ 1jt, SM > 1jt)
- Modular Workspace UX (`<CountGrid>`, `<DailyClosingSwitcher>`, `<KasBesarForm>`, `<MobileApprovalCard>`) with numpad traversal, 800ms debounce autosave, and multi-tier image compression
- Excel BACO export & `@media print` reports
- In-app notifications & comprehensive activity audit logs
