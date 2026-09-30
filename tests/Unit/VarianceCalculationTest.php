<?php

use App\Models\CashOpnameSession;

test('T-VAR-01: Variance formula: Total = K_fisik + K_bon + K_bri', function () {
    $kFisik = 250000000; // Rp 2.500.000 (Safe)
    $kBon = 150000000;   // Rp 1.500.000 (DISBURSED vouchers)
    $kBri = 100000000;   // Rp 1.000.000 (Net BRI)

    $totalActual = $kFisik + $kBon + $kBri;
    expect($totalActual)->toBe(500000000); // Rp 5.000.000
});

test('T-VAR-02: Target = imprest + V_prev', function () {
    $imprestFund = 500000000; // Rp 5.000.000 ceiling
    $vPrev = -2000000;        // Carried-forward shortage of Rp 20.000

    $targetReconciled = $imprestFund + $vPrev;
    expect($targetReconciled)->toBe(498000000); // Rp 4.980.000
});

test('T-VAR-03: V_current = Total - Target', function () {
    $totalActual = 498000000;
    $targetReconciled = 498000000;

    $vCurrent = $totalActual - $targetReconciled;
    expect($vCurrent)->toBe(0);

    // Case with surplus
    $totalActualSurplus = 502000000;
    expect($totalActualSurplus - $targetReconciled)->toBe(4000000);

    // Case with shortage
    $totalActualShortage = 495000000;
    expect($totalActualShortage - $targetReconciled)->toBe(-3000000);
});

test('T-VAR-04: Carry-forward: target adjusted by V_prev', function () {
    $imprestFund = 500000000; // Rp 5.000.000
    $vPrevShortage = -1500000; // -Rp 15.000
    expect($imprestFund + $vPrevShortage)->toBe(498500000);

    $vPrevSurplus = 2500000; // +Rp 25.000
    expect($imprestFund + $vPrevSurplus)->toBe(502500000);
});

test('T-VAR-05: First session: V_prev = 0 produces Target = imprest', function () {
    $imprestFund = 500000000;
    $vPrev = 0;
    $target = $imprestFund + $vPrev;
    expect($target)->toBe($imprestFund);
});

test('T-VAR-06: BALANCED when V_current = 0', function () {
    $vCurrent = 0;
    $status = match (true) {
        $vCurrent === 0 => CashOpnameSession::VARIANCE_BALANCED,
        $vCurrent > 0 => CashOpnameSession::VARIANCE_SURPLUS,
        default => CashOpnameSession::VARIANCE_SHORTAGE,
    };

    expect($status)->toBe('BALANCED');
});

test('T-VAR-07: SURPLUS when V_current > 0', function () {
    $vCurrent = 150000; // +Rp 1.500
    $status = match (true) {
        $vCurrent === 0 => CashOpnameSession::VARIANCE_BALANCED,
        $vCurrent > 0 => CashOpnameSession::VARIANCE_SURPLUS,
        default => CashOpnameSession::VARIANCE_SHORTAGE,
    };

    expect($status)->toBe('SURPLUS');
});

test('T-VAR-08: SHORTAGE when V_current < 0', function () {
    $vCurrent = -500000; // -Rp 5.000
    $status = match (true) {
        $vCurrent === 0 => CashOpnameSession::VARIANCE_BALANCED,
        $vCurrent > 0 => CashOpnameSession::VARIANCE_SURPLUS,
        default => CashOpnameSession::VARIANCE_SHORTAGE,
    };

    expect($status)->toBe('SHORTAGE');
});
