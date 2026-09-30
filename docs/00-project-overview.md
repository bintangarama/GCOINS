# 00 — Project Overview

## Project Identity

| Field | Value |
|---|---|
| **Project Name** | G-COINS (Gramedia Cash Opname Internal System) |
| **Organization** | PT Gramedia Asri Media — Toko Gramedia World Karawang |
| **Store Code** | `10435` |
| **Version** | 2.0.0 (Re-development) |
| **Document Version** | 1.0.0 |

## Purpose

G-COINS automates the daily cash reconciliation (*cash opname*) process for Gramedia retail stores. It replaces error-prone manual spreadsheet workflows with a web application that ensures mathematical integrity, audit traceability, and role-based authorization.

## Goals & Success Criteria

1. **Zero floating-point errors** in all financial calculations (using integer cents)
2. **Complete audit trail** for every financial state change
3. **Role-based access control** enforcing segregation of duties
4. **Immutable snapshots** of approved cash opname sessions
5. **Variance carry-forward chain** that never breaks across periods
6. **Multi-store ready** architecture from day one
7. **Extensible** to 5 types of cash opname (KAS_KECIL first, 4 others later)

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
| Frontend | React 19 + TypeScript, Inertia.js v2, shadcn/ui + Tailwind CSS v4 |
| Backend | Laravel 13 (PHP 8.3+), Eloquent ORM |
| Database | SQLite (WAL mode, INTEGER cents) |
| Auth | Cookie-based session (24h TTL, database driver) |
| RBAC | Spatie Laravel-Permission |
| Audit | Spatie Laravel-Activitylog |
| Excel | Maatwebsite/Excel |
| AI Tooling | Laravel Boost, shadcn Skills |
| Infrastructure | VPS 1CPU/2GB, Nginx, PHP-FPM, Supervisor |

## Scope — Phase 1 (MVP)

**Focus: KAS_KECIL (Petty Cash) cash opname — fully production-ready**

Includes:
- Authentication & user management
- Voucher bon kas kecil (full lifecycle)
- BRI fund posting & sub-ledger
- Cash opname session (denomination counting, BRI reconciliation, variance engine)
- Excel BACO export
- Print-friendly reports
- In-app notifications
- Import/export data
- Audit logs

Excludes (deferred to Phase 2+):
- KAS_BESAR opname
- ACTIVE_SELLING opname
- MATERAI opname
- VOUCHER opname
- WhatsApp notifications
- Mobile native app (PWA only)
