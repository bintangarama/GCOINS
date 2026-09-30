<?php

test('T-DEN-01: 11 denominations count * nominal = subtotal (all 11)', function () {
    $denominations = [
        ['nominal_cents' => 10000000, 'count' => 5,  'expected_subtotal' => 50000000],  // 5 x 100k = 500k
        ['nominal_cents' => 5000000,  'count' => 10, 'expected_subtotal' => 50000000],  // 10 x 50k = 500k
        ['nominal_cents' => 2000000,  'count' => 15, 'expected_subtotal' => 30000000],  // 15 x 20k = 300k
        ['nominal_cents' => 1000000,  'count' => 20, 'expected_subtotal' => 20000000],  // 20 x 10k = 200k
        ['nominal_cents' => 500000,   'count' => 30, 'expected_subtotal' => 15000000],  // 30 x 5k = 150k
        ['nominal_cents' => 200000,   'count' => 50, 'expected_subtotal' => 10000000],  // 50 x 2k = 100k
        ['nominal_cents' => 100000,   'count' => 25, 'expected_subtotal' => 2500000],   // 25 x 1k (kertas) = 25k
        ['nominal_cents' => 100000,   'count' => 10, 'expected_subtotal' => 1000000],   // 10 x 1k (logam) = 10k
        ['nominal_cents' => 50000,    'count' => 40, 'expected_subtotal' => 2000000],   // 40 x 500 = 20k
        ['nominal_cents' => 20000,    'count' => 25, 'expected_subtotal' => 500000],    // 25 x 200 = 5k
        ['nominal_cents' => 10000,    'count' => 50, 'expected_subtotal' => 500000],    // 50 x 100 = 5k
    ];

    expect(count($denominations))->toBe(11);

    foreach ($denominations as $denom) {
        $subtotal = $denom['count'] * $denom['nominal_cents'];
        expect($subtotal)->toBe($denom['expected_subtotal']);
    }
});

test('T-DEN-02: K_fisik = sum of all subtotals', function () {
    $subtotals = [
        50000000,
        50000000,
        30000000,
        20000000,
        15000000,
        10000000,
        2500000,
        1000000,
        2000000,
        500000,
        500000,
    ];

    $kFisik = array_sum($subtotals);
    expect($kFisik)->toBe(181500000); // Rp 1.815.000,00
});
