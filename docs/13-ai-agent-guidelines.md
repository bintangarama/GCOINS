# 13 — AI Agent Guidelines

> Rules and conventions for AI agents working on the G-COINS codebase. Read this before every task.

## 1. Mandatory Pre-Task Checklist

Before writing any code, the AI agent MUST:

1. **Read the relevant `/docs` file** for the module being worked on
2. **Check `05-business-rules.md`** — all 12 rules are non-negotiable
3. **Check `07-database-design.md`** — ensure schema consistency
4. **Check existing Action classes** — avoid duplicating logic
5. **Run `php artisan test`** after every meaningful change

## 2. Code Conventions

### PHP / Laravel

| Convention | Rule |
|---|---|
| **PHP Version** | 8.3+ features allowed (typed properties, enums, match, fibers) |
| **Style** | PSR-12, enforced via Laravel Pint (`./vendor/bin/pint`) |
| **Models** | Eloquent models in `app/Models/`. Use `$casts`, `$fillable`, relationships. |
| **Controllers** | Thin controllers — delegate business logic to Action classes |
| **Actions** | One class = one business operation. Located in `app/Actions/{Domain}/` |
| **Form Requests** | All validation in dedicated `FormRequest` classes in `app/Http/Requests/` |
| **Policies** | Authorization in `app/Policies/`. Register in `AuthServiceProvider`. |
| **Money** | **ALWAYS INTEGER CENTS**. Never use float/double for money. Column suffix: `_cents` |
| **Naming** | snake_case for DB columns, camelCase for PHP variables, PascalCase for classes |
| **Enums** | Use PHP 8.1 backed enums for status, role, category values |
| **Tests** | Pest PHP. Feature tests for business flows, Unit tests for calculations. |

### TypeScript / React

| Convention | Rule |
|---|---|
| **Components** | Functional components only. PascalCase filenames. |
| **Pages** | In `resources/js/pages/`. Match Inertia route structure. |
| **Types** | Strict TypeScript. Define types in `resources/js/types/`. |
| **shadcn/ui** | Use shadcn components for ALL UI elements. Do not create custom components that replicate shadcn functionality. |
| **Styling** | Tailwind CSS only. No inline styles. No custom CSS except for print layout. |
| **Money Display** | Use `formatMoney(cents)` helper from `resources/js/lib/money.ts` |
| **Forms** | Use Inertia's `useForm` hook. Mirror Laravel validation with Zod on client. |
| **State** | Minimal client state. Prefer server-side data via Inertia props. |

### Database

| Convention | Rule |
|---|---|
| **Migrations** | One migration per table or per change. Descriptive names. |
| **Column naming** | snake_case. Money columns end with `_cents`. |
| **Primary keys** | CUID v2 string (VARCHAR 32). Use `Str::cuid2()`. |
| **Timestamps** | Always include `created_at`, `updated_at`. UTC storage. |
| **Soft delete** | Only where specified (voucher drafts). Use `SoftDeletes` trait. |
| **Foreign keys** | Always define FK constraints. `PRAGMA foreign_keys = ON`. |
| **Indexes** | Add indexes on columns used in WHERE, JOIN, ORDER BY. |

## 3. Critical Do's and Don'ts

### ✅ DO

- **DO** use Action classes for all business logic (not controllers)
- **DO** wrap financial state changes in database transactions
- **DO** create audit log entries for every financial status change
- **DO** check permissions via Policies before every action
- **DO** validate anti self-approval at the Action layer (not just UI)
- **DO** validate zero-deficit guard at both creation AND approval time
- **DO** use `store_id` scope on every query (via Global Scope)
- **DO** write tests for new business rules immediately
- **DO** use Inertia's `router.visit()` or `useForm` for navigation/forms
- **DO** compress images client-side before upload
- **DO** use proper HTTP methods (GET for reads, POST for actions, PUT for updates)
- **DO** format money consistently: `Rp 5.000.000` (no decimals for display)

### ❌ DON'T

- **DON'T** use float/double for money. EVER.
- **DON'T** bypass RBAC checks — even for "quick fixes"
- **DON'T** modify APPROVED opname sessions — they are immutable
- **DON'T** break the carry-forward chain (V_prev → V_current)
- **DON'T** create REST API endpoints — use Inertia controllers only
- **DON'T** put business logic in controllers — use Actions
- **DON'T** hardcode store-specific values — use `store_opname_configs`
- **DON'T** hardcode item definitions — use `opname_item_definitions` table
- **DON'T** skip audit logging for financial operations
- **DON'T** create custom UI components when shadcn has an equivalent
- **DON'T** use `any` type in TypeScript — define proper types
- **DON'T** write raw SQL — use Eloquent builder

## 4. Multi-Tenancy Reminder

Every model with `store_id` MUST:

1. Use the `HasStoreScope` trait (which adds the Global Scope)
2. Include `store_id` in `$fillable`
3. Set `store_id` automatically from auth context in Action classes
4. Have `store_id` in relevant indexes

**Exception**: `stores` table itself, `audit_logs` (SYSTEM_ADMIN may have global logs)

## 5. Money Handling Cheat Sheet

```php
// INPUT: User enters "50000" (Rupiah)
$cents = 50000 * 100; // → 5000000 cents

// STORAGE: Always integer cents in DB
$voucher->amount_cents = 5000000;

// CALCULATION: All math on cents
$total = $k_fisik_cents + $k_bon_cents + $k_bri_cents;
$variance = $total - $target_cents;

// OUTPUT: Display formatted Rupiah
formatRupiah(5000000); // → "Rp 50.000"
```

```typescript
// TypeScript equivalent
const formatMoney = (cents: number): string => {
  const rupiah = Math.floor(cents / 100);
  return `Rp ${rupiah.toLocaleString('id-ID')}`;
};
```

## 6. File Organization Quick Reference

```
app/Actions/{Domain}/{ActionName}Action.php  ← Business logic
app/Http/Controllers/{Name}Controller.php    ← Thin, delegates to Actions
app/Http/Requests/{Domain}/{Name}Request.php ← Validation rules
app/Models/{ModelName}.php                   ← Eloquent model
app/Policies/{ModelName}Policy.php           ← Authorization
app/Scopes/StoreScope.php                    ← Multi-tenancy
app/Exports/{Name}Export.php                 ← Excel exports

resources/js/pages/{Domain}/{PageName}.tsx   ← Inertia pages
resources/js/components/ui/                  ← shadcn components
resources/js/components/domain/{domain}/     ← Domain-specific components
resources/js/components/shared/              ← Shared components
resources/js/lib/money.ts                    ← Money formatting
resources/js/types/                          ← TypeScript types

tests/Unit/{CalculationName}Test.php         ← Calculation tests
tests/Feature/{Domain}/{ActionName}Test.php  ← Business flow tests
```

## 7. Commit Message Format

```
feat(voucher): add batch settlement action
fix(opname): correct carry-forward V_prev query
test(bri): add zero-deficit guard test cases
refactor(auth): extract PIN validation to action
docs: update database design for notifications table
```

Format: `{type}({scope}): {description}`

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`
