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
| T-VAR-01 | Variance formula: Total = K_fisik + K_bon + K_bri | Unit |
| T-VAR-02 | Target = imprest + V_prev | Unit |
| T-VAR-03 | V_current = Total - Target | Unit |
| T-VAR-04 | Carry-forward: new session reads V_prev from last APPROVED | Feature |
| T-VAR-05 | First session: V_prev = 0 | Feature |
| T-VAR-06 | BALANCED when V_current = 0 | Unit |
| T-VAR-07 | SURPLUS when V_current > 0 | Unit |
| T-VAR-08 | SHORTAGE when V_current < 0 | Unit |
| T-SAP-01 | SAC cannot approve own voucher (FORBIDDEN_SELF_APPROVAL) | Feature |
| T-SAP-02 | SAC can approve other's voucher | Feature |
| T-SAP-03 | SS can approve SAC's own voucher | Feature |
| T-AMN-01 | Outflow rejected when amount > running balance | Feature |
| T-AMN-02 | Outflow accepted when amount = running balance | Feature |
| T-AMN-03 | Outflow accepted when amount < running balance | Feature |
| T-DC-01 | SAC cannot approve own BRI outflow | Feature |
| T-DC-02 | SS can approve SAC's BRI outflow | Feature |
| T-LCK-01 | APPROVED session cannot be modified | Feature |
| T-LCK-02 | APPROVED session items cannot be updated | Feature |
| T-LCK-03 | APPROVED session BRI sub-ledger cannot be updated | Feature |

### 🟡 High Priority

| Test ID | Description | Type |
|---|---|---|
| T-STM-01 | Voucher: DRAFT → SUBMITTED valid | Feature |
| T-STM-02 | Voucher: SUBMITTED → APPROVED_SS valid | Feature |
| T-STM-03 | Voucher: APPROVED_SS → DISBURSED valid | Feature |
| T-STM-04 | Voucher: DISBURSED → SETTLED valid (batch) | Feature |
| T-STM-05 | Voucher: invalid transition rejected | Feature |
| T-STM-06 | Opname: DRAFT → SUBMITTED → VERIFIED_SS → APPROVED | Feature |
| T-STM-07 | Opname: SS reject → back to DRAFT | Feature |
| T-STM-08 | Opname: SM reject → back to DRAFT | Feature |
| T-STM-09 | BRI: INFLOW immediately APPROVED | Feature |
| T-STM-10 | BRI: OUTFLOW → PENDING_SS → APPROVED | Feature |
| T-RBAC-01 | SOA cannot open opname session | Feature |
| T-RBAC-02 | SOA cannot disburse cash | Feature |
| T-RBAC-03 | SS cannot sign-off opname | Feature |
| T-RBAC-04 | SM cannot create vouchers | Feature |
| T-RBAC-05 | SYSTEM_ADMIN cannot modify financial data | Feature |
| T-DEN-01 | 11 denominations: count × nominal = subtotal (all 11) | Unit |
| T-DEN-02 | K_fisik = sum of all subtotals | Unit |
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
│   ├── MoneyFormattingTest.php
│   └── DocumentNumberGeneratorTest.php
├── Feature/
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   ├── LogoutTest.php
│   │   └── ChangePinTest.php
│   ├── Voucher/
│   │   ├── CreateVoucherTest.php
│   │   ├── ApproveVoucherTest.php
│   │   ├── DisburseVoucherTest.php
│   │   ├── SettleVoucherTest.php
│   │   ├── RejectVoucherTest.php
│   │   ├── SelfApprovalPreventionTest.php
│   │   └── VoucherStateTransitionTest.php
│   ├── Opname/
│   │   ├── OpenSessionTest.php
│   │   ├── UpdateDenominationsTest.php
│   │   ├── SubmitSessionTest.php
│   │   ├── VerifySessionTest.php
│   │   ├── SignOffSessionTest.php
│   │   ├── ImmutableLockTest.php
│   │   └── CarryForwardTest.php
│   ├── BriFund/
│   │   ├── CreateInflowTest.php
│   │   ├── CreateOutflowTest.php
│   │   ├── ApproveOutflowTest.php
│   │   ├── ZeroDeficitGuardTest.php
│   │   └── DualControlTest.php
│   ├── MultiTenancy/
│   │   └── StoreIsolationTest.php
│   └── Export/
│       └── BacoExcelExportTest.php
└── TestCase.php
```

## 4. Test Data Factories

```php
// Key factories needed:
StoreFactory::class          // Default store with config
UserFactory::class           // Per role variants
VoucherFactory::class        // Per status variants
OpnameSessionFactory::class  // Per status variants
BriFundPostingFactory::class // INFLOW/OUTFLOW variants
ItemDefinitionFactory::class // 11 KAS_KECIL items
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
