<?php

test('rule 1: money is always stored as integer cents', function () {
    // Rp 5.000.000 = 500,000,000 cents
    $imprestRupiah = 5000000;
    $imprestCents = $imprestRupiah * 100;

    expect($imprestCents)->toBe(500000000)
        ->and(is_int($imprestCents))->toBeTrue();

    // Rp 100.000 = 10,000,000 cents
    $hundredThousandRupiah = 100000;
    $hundredThousandCents = $hundredThousandRupiah * 100;

    expect($hundredThousandCents)->toBe(10000000)
        ->and(is_int($hundredThousandCents))->toBeTrue();
});

test('rule 2: three pockets formula uses integer cents arithmetic', function () {
    $kFisik = 250000000; // Rp 2.500.000 in physical cash
    $kBon = 150000000;   // Rp 1.500.000 in vouchers
    $kBri = 100000000;   // Rp 1.000.000 net in BRI

    $totalActual = $kFisik + $kBon + $kBri;
    expect($totalActual)->toBe(500000000);

    $imprest = 500000000; // Rp 5.000.000
    $vPrev = 0;
    $targetReconciled = $imprest + $vPrev;
    $vCurrent = $totalActual - $targetReconciled;

    expect($vCurrent)->toBe(0)
        ->and(is_int($vCurrent))->toBeTrue();
});
