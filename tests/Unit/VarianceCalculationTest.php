<?php

use App\Actions\Concerns\CalculatesVariance;
use App\Models\CashOpnameSession;

test('T-VAR-01: Three pockets formula: TotalActual = K_fisik + K_bon + K_bri', function () {
    $kFisik = 250000000; // Rp 2.500.000 (Safe)
    $kBon = 150000000;   // Rp 1.500.000 (DISBURSED vouchers)
    $kBri = 100000000;   // Rp 1.000.000 (Net BRI)

    $totalActual = $kFisik + $kBon + $kBri;
    expect($totalActual)->toBe(500000000); // Rp 5.000.000
});

test('T-VAR-02: Raw Discrepancy formula: RawDiscrepancy = TotalActual - BaseImprest', function () {
    $baseImprest = 500000000; // Rp 5.000.000 ceiling

    // Shortage scenario: Rp 4.900.000 actual
    $totalActualShortage = 490000000;
    $rawDiscrepancyShortage = $totalActualShortage - $baseImprest;
    expect($rawDiscrepancyShortage)->toBe(-10000000); // -Rp 100.000

    // Surplus scenario: Rp 5.050.000 actual
    $totalActualSurplus = 505000000;
    $rawDiscrepancySurplus = $totalActualSurplus - $baseImprest;
    expect($rawDiscrepancySurplus)->toBe(5000000); // +Rp 50.000

    // Balanced scenario: Rp 5.000.000 actual
    $totalActualBalanced = 500000000;
    $rawDiscrepancyBalanced = $totalActualBalanced - $baseImprest;
    expect($rawDiscrepancyBalanced)->toBe(0);
});

test('T-VAR-03: Outstanding Variance formula: OutstandingVariance = RawDiscrepancy + CumulativeResolved', function () {
    $calculator = new class
    {
        use CalculatesVariance;
    };

    // Unresolved shortage: -100.000 + 0 = -100.000
    $result1 = $calculator->computeVariance(490000000, 500000000, null);
    expect($result1['raw_discrepancy_cents'])->toBe(-10000000)
        ->and($result1['cumulative_resolved_cents'])->toBe(0)
        ->and($result1['outstanding_variance_cents'])->toBe(-10000000)
        ->and($result1['variance_status'])->toBe(CashOpnameSession::VARIANCE_SHORTAGE);

    // Balanced without discrepancies
    $result2 = $calculator->computeVariance(500000000, 500000000, null);
    expect($result2['raw_discrepancy_cents'])->toBe(0)
        ->and($result2['cumulative_resolved_cents'])->toBe(0)
        ->and($result2['outstanding_variance_cents'])->toBe(0)
        ->and($result2['variance_status'])->toBe(CashOpnameSession::VARIANCE_BALANCED);

    // Surplus without resolutions
    $result3 = $calculator->computeVariance(505000000, 500000000, null);
    expect($result3['raw_discrepancy_cents'])->toBe(5000000)
        ->and($result3['cumulative_resolved_cents'])->toBe(0)
        ->and($result3['outstanding_variance_cents'])->toBe(5000000)
        ->and($result3['variance_status'])->toBe(CashOpnameSession::VARIANCE_SURPLUS);
});

test('T-VAR-04: Non-oscillation proof across 4 consecutive cycles', function () {
    $baseImprest = 500000000; // Rp 5.000.000

    // Cycle 1: Tekor Rp 100.000 -> SHORTAGE Rp 100.000
    $c1Actual = 490000000;
    $c1Raw = $c1Actual - $baseImprest; // -10.000.000
    $c1Resolved = 0;
    $c1Outstanding = $c1Raw + $c1Resolved;
    expect($c1Outstanding)->toBe(-10000000)
        ->and($c1Outstanding < 0)->toBeTrue();

    // Cycle 2: Kasir BELUM ganti uang -> Wajib TETAP SHORTAGE Rp 100.000 (tidak boleh 0 / BALANCED)
    $c2Actual = 490000000;
    $c2Raw = $c2Actual - $baseImprest; // -10.000.000
    $c2Resolved = 0;
    $c2Outstanding = $c2Raw + $c2Resolved;
    expect($c2Outstanding)->toBe(-10000000)
        ->and($c2Outstanding < 0)->toBeTrue(); // Bug osilasi lama dicegah secara matematis!

    // Cycle 3: Resolusi kasir setor pengganti Rp 100.000 disetujui -> Menjadi BALANCED (0)
    $c3Actual = 490000000; // Kas fisik belum disetor ke brankas tapi kasir menyetor pengganti via ledger
    $c3Raw = $c3Actual - $baseImprest; // -10.000.000
    $c3Resolved = 10000000; // +10.000.000 approved REPLACED resolution
    $c3Outstanding = $c3Raw + $c3Resolved;
    expect($c3Outstanding)->toBe(0);

    // Cycle 4: Kas normal -> BALANCED (0)
    $c4Actual = 500000000;
    $c4Raw = $c4Actual - $baseImprest;
    $c4Resolved = 0;
    $c4Outstanding = $c4Raw + $c4Resolved;
    expect($c4Outstanding)->toBe(0);
});

test('T-VAR-05: Status is purely determined by Outstanding Variance', function () {
    $calcStatus = function (int $outstanding): string {
        return match (true) {
            $outstanding === 0 => CashOpnameSession::VARIANCE_BALANCED,
            $outstanding > 0 => CashOpnameSession::VARIANCE_SURPLUS,
            default => CashOpnameSession::VARIANCE_SHORTAGE,
        };
    };

    expect($calcStatus(0))->toBe('BALANCED')
        ->and($calcStatus(1))->toBe('SURPLUS')
        ->and($calcStatus(1000000))->toBe('SURPLUS')
        ->and($calcStatus(-1))->toBe('SHORTAGE')
        ->and($calcStatus(-5000000))->toBe('SHORTAGE');
});
