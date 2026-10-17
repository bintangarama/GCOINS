# 12 — Testing Strategy

## 1. Testing Framework

- **Backend**: Pest PHP (Laravel's recommended testing framework)
- **Type**: Feature tests (HTTP tests via Inertia Testing helpers) + Unit tests for calculations
- **Database**: In-memory SQLite for test speed (same driver as production)
- **Factories**: Laravel Model Factories for test data generation

## 2. Test Priority Matrix

### 🔴 Critical (Must Pass Before Deploy)

| Test ID | Description | Type |
|---|---|---|
| T-VAR-01 | Raw discrepancy: TotalActual - TargetAmount | Unit/Feature |
| T-VAR-02 | Cumulative resolved: sum of approved resolutions in variance ledger | Feature |
| T-VAR-03 | Outstanding variance: RawDiscrepancy + CumulativeResolved | Feature |
| T-VAR-04 | Carry-forward: new session carries forward unresolved outstanding variance | Feature |
| T-VAR-05 | BALANCED when OutstandingVariance = 0 | Unit |
| T-VAR-06 | SURPLUS when OutstandingVariance > 0, SHORTAGE when < 0 | Unit |
| T-STR-01 | ThreePocketsReconciler (KAS_KECIL): Safe fisik + Bon gantung + Net BRI | Feature |
| T-STR-02 | CashFlowReconciler (KAS_BESAR): Safe fisik vs (Opening + Z-Report - Deposits - Payouts) | Feature |
| T-STR-03 | ConsignmentReconciler (ACTIVE_SELLING): Kas fisik bazar vs (Modal Awal + Jual - Biaya - Setor) | Feature |
| T-STR-04 | StockCountReconciler (MATERAI): Keping fisik baik vs Saldo buku (Opening + In - Out - Damaged) | Feature |
| T-STR-05 | SerialStockReconciler (GIFT_VOUCHER): Fisik voucher vs Kartu stok / Rentang seri | Feature |
| T-SOD-01 | SAC cannot create user with role >= SS (403 Forbidden) | Feature |
| T-SOD-02 | SAC cannot edit user to role >= SS (403 Forbidden) | Feature |
| T-SOD-03 | User cannot change their own role (anti-privilege escalation) | Feature |
| T-SOD-04 | SAC cannot reset PIN of SS, SM, or SYSTEM_ADMIN | Feature |
| T-SAP-01 | SAC cannot approve own voucher (FORBIDDEN_SELF_APPROVAL) | Feature |
| T-AMN-01 | Outflow rejected when amount > running balance (Zero-Deficit Guard) | Feature |
| T-DC-01 | SAC cannot approve own BRI outflow | Feature |
| T-DC-02 | Tiered Outflow: Outflow > Rp 500.000 requires SM approval (SS forbidden) | Feature |
| T-RES-01 | Tiered Write-Off: Write-off > Rp 1.000.000 requires SM approval (SS forbidden) | Feature |
| T-LCK-01 | APPROVED session cannot be modified (items, references, snapshots immutable) | Feature |

### 🟡 High Priority

| Test ID | Description | Type |
|---|---|---|
| T-STM-01 | Voucher: DRAFT → SUBMITTED valid | Feature |
| T-STM-02 | Voucher: SUBMITTED → APPROVED_SS valid | Feature |
| T-STM-03 | Voucher: APPROVED_SS → DISBURSED valid | Feature |
| T-STM-04 | Voucher: DISBURSED → SETTLED valid (batch) | Feature |
| T-STM-05 | Voucher: invalid transition rejected | Feature |
| T-STM-06 | Opname: DRAFT → SUBMITTED → VERIFIED_SS → APPROVED | Feature |
| T-STM-07 | Opname: SS reject → back to DRAFT with reason | Feature |
| T-STM-08 | Opname: SM reject → back to DRAFT with reason | Feature |
| T-STM-09 | BRI: INFLOW immediately APPROVED | Feature |
| T-STM-10 | BRI: OUTFLOW → PENDING_SS → APPROVED | Feature |
| T-RES-02 | Variance resolution: Store resolution (REPLACED / WRITE_OFF / FOUND) | Feature |
| T-RES-03 | Variance resolution: Reject resolution leaves variance unchanged | Feature |
| T-RBAC-01 | SOA cannot open opname session | Feature |
| T-RBAC-02 | SOA cannot disburse cash | Feature |
| T-RBAC-03 | SS cannot sign-off opname | Feature |
| T-RBAC-04 | SM cannot create vouchers | Feature |
| T-RBAC-05 | SYSTEM_ADMIN cannot modify financial data | Feature |
| T-DEN-01 | Dynamic denominations: count × nominal = subtotal | Unit |
| T-DEN-02 | K_fisik = sum of all item subtotals | Unit |
| T-DEN-03 | Auto-heal: missing items created with count 0 | Feature |
| T-BRI-01 | Running balance = Σ INFLOW(approved) - Σ OUTFLOW(approved) | Unit |
| T-BRI-02 | K_bri = mutation - Σ allocations | Unit |
| T-BRI-03 | PENDING_SS outflow does NOT affect running balance | Feature |

### 🟢 Medium Priority

| Test ID | Description | Type |
|---|---|---|
| T-AUTH-01 | Login with valid NIK + PIN succeeds | Feature |
| T-AUTH-02 | Login with invalid PIN fails | Feature |
| T-AUTH-03 | Inactive user cannot login | Feature |
| T-AUTH-04 | Session expires after 24h | Feature |
| T-AUTH-05 | Change PIN requires current PIN | Feature |
| T-MT-01 | User can only see their store's data | Feature |
| T-MT-02 | User cannot access another store's voucher | Feature |
| T-MT-03 | SYSTEM_ADMIN can see cross-store data | Feature |
| T-DEL-01 | Soft delete voucher DRAFT sets deleted_at | Feature |
| T-DEL-02 | Soft deleted voucher not shown in list | Feature |
| T-NTF-01 | Notification created on voucher submit | Feature |
| T-NTF-02 | Notification created on opname submit | Feature |
| T-XLS-01 | Excel export generates valid .xlsx file | Feature |
| T-XLS-02 | Excel contains correct formula cells | Feature |
| T-AUD-01 | Audit log created on voucher status change | Feature |
| T-AUD-02 | Audit log captures old and new values | Feature |
| T-NUM-01 | Voucher number format correct | Unit |
| T-NUM-02 | Sequential counter increments per month | Feature |
| T-NUM-03 | No duplicate voucher numbers | Feature |

## 3. Test File Structure

```
tests/
├── Unit/
│   ├── VarianceCalculationTest.php
│   ├── DenominationCalculationTest.php
│   ├── BriBalanceCalculationTest.php
│   ├── MoneyTest.php
│   └── DocumentNumberGeneratorTest.php
├── Feature/
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   ├── LogoutTest.php
│   │   └── ChangePinTest.php
│   ├── User/
│   │   ├── UserManagementTest.php
│   │   └── UserSodSecurityTest.php
│   ├── Voucher/
│   │   ├── CreateVoucherTest.php
│   │   ├── ApproveVoucherTest.php
│   │   ├── DisburseAndSettleVoucherTest.php
│   │   ├── SelfApprovalPreventionTest.php
│   │   ├── VoucherSoftDeleteTest.php
│   │   └── VoucherStateTransitionTest.php
│   ├── Opname/
│   │   ├── OpenSessionTest.php
│   │   ├── UpdateDenominationsTest.php
│   │   ├── UpdateBriSubledgerTest.php
│   │   ├── SignOffWorkflowTest.php
│   │   ├── ImmutableLockTest.php
│   │   ├── CarryForwardChainTest.php
│   │   ├── SessionHistoryTest.php
│   │   ├── SignedBaUploadTest.php
│   │   ├── BacoExcelExportTest.php
│   │   └── Strategy/
│   │       ├── ThreePocketsReconcilerTest.php
│   │       ├── CashFlowReconcilerTest.php
│   │       ├── ConsignmentReconcilerTest.php
│   │       ├── SerialStockReconcilerTest.php
│   │       └── StockCountReconcilerTest.php
│   ├── Resolution/
│   │   └── ApproveResolutionActionTest.php
│   ├── BriFund/
│   │   ├── CreateInflowTest.php
│   │   ├── CreateOutflowTest.php
│   │   ├── ApproveOutflowTest.php
│   │   ├── ZeroDeficitGuardTest.php
│   │   └── DualControlTest.php
│   ├── Rbac/
│   │   └── StoreScopeTest.php
│   ├── Report/
│   │   ├── BriPostingSummaryExportTest.php
│   │   └── VoucherRecapExportTest.php
│   ├── ImportExport/
│   │   └── ImportExportTest.php
│   ├── Notification/
│   │   └── NotificationTest.php
│   └── Admin/
│       └── StoreSettingsTest.php
└── TestCase.php
```

## 4. Test Data Factories

```php
// Key factories implemented:
StoreFactory::class          // Default store with config
UserFactory::class           // Per role variants (SYSTEM_ADMIN, SM, SS, SAC, SOA)
VoucherFactory::class        // Per status variants
OpnameSessionFactory::class  // Per status & type variants (KAS_KECIL, KAS_BESAR, etc.)
BriFundPostingFactory::class // INFLOW/OUTFLOW variants
ItemDefinitionFactory::class // Configurable denomination & physical item items
VarianceResolutionFactory::class // REPLACED, WRITE_OFF, FOUND variants
```

## 5. Running Tests

```bash
# Run all tests
php artisan test

# Run specific test file
php artisan test --filter=SelfApprovalPreventionTest

# Run only critical tests
php artisan test --group=critical

# Run with coverage
php artisan test --coverage --min=70
```

## 6. CI Validation Checklist

Before any deploy:
- [ ] All 🔴 Critical tests pass
- [ ] All 🟡 High Priority tests pass
- [ ] No PHP deprecation warnings
- [ ] No TypeScript compilation errors
- [ ] Database migration runs clean on fresh SQLite
