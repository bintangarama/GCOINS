<?php

use App\Models\CashOpnameSession;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use App\Services\DocumentNumberGenerator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('T-NUM-01: voucher number format is correct {SEQ}/{TYPE_CODE}/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}', function () {
    $store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $generator = new DocumentNumberGenerator;
    $date = Carbon::create(2026, 9, 25); // September 2026 -> IX / 2026

    $voucherNumber = $generator->generateVoucherNumber($store, $date, 'KKCL');

    expect($voucherNumber)->toBe('001/KKCL/10435/IX/2026');
});

test('T-NUM-02: sequential counter increments per month', function () {
    $store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $user = User::create([
        'store_id' => $store->id,
        'nik' => 'SAC001',
        'name' => 'SAC User',
        'role' => 'SAC',
        'pin_hash' => 'hash',
        'is_active' => true,
    ]);

    $generator = new DocumentNumberGenerator;
    $dateSep = Carbon::create(2026, 9, 1);

    // Create 1st voucher in September
    $num1 = $generator->generateVoucherNumber($store, $dateSep);
    expect($num1)->toBe('001/KKCL/10435/IX/2026');

    PettyCashVoucher::create([
        'store_id' => $store->id,
        'voucher_number' => $num1,
        'requester_id' => $user->id,
        'amount_cents' => 5000000,
        'purpose' => 'First voucher',
        'category' => 'OPERASIONAL',
        'status' => 'DRAFT',
    ]);

    // Create 2nd voucher in September -> should increment to 002
    $num2 = $generator->generateVoucherNumber($store, $dateSep);
    expect($num2)->toBe('002/KKCL/10435/IX/2026');

    PettyCashVoucher::create([
        'store_id' => $store->id,
        'voucher_number' => $num2,
        'requester_id' => $user->id,
        'amount_cents' => 10000000,
        'purpose' => 'Second voucher',
        'category' => 'OPERASIONAL',
        'status' => 'DRAFT',
    ]);

    // Next month (October) -> counter resets to 001
    $dateOct = Carbon::create(2026, 10, 1);
    $numOct = $generator->generateVoucherNumber($store, $dateOct);
    expect($numOct)->toBe('001/KKCL/10435/X/2026');
});

test('T-NUM-03: no duplicate voucher numbers when deleted draft exists', function () {
    $store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $user = User::create([
        'store_id' => $store->id,
        'nik' => 'SAC001',
        'name' => 'SAC User',
        'role' => 'SAC',
        'pin_hash' => 'hash',
        'is_active' => true,
    ]);

    $generator = new DocumentNumberGenerator;
    $date = Carbon::create(2026, 9, 15);

    $num1 = $generator->generateVoucherNumber($store, $date);
    $v1 = PettyCashVoucher::create([
        'store_id' => $store->id,
        'voucher_number' => $num1,
        'requester_id' => $user->id,
        'amount_cents' => 5000000,
        'purpose' => 'Deleted voucher',
        'category' => 'OPERASIONAL',
        'status' => 'DRAFT',
    ]);

    // Soft delete the voucher
    $v1->delete();

    // Next generated voucher should be 002, not duplicate 001!
    $num2 = $generator->generateVoucherNumber($store, $date);
    expect($num2)->toBe('002/KKCL/10435/IX/2026');
});

test('generateOpnameNumber generates correct format and sequence', function () {
    $store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    $generator = new DocumentNumberGenerator;
    $date = Carbon::create(2026, 9, 25);

    $opnameNumber1 = $generator->generateOpnameNumber($store, 'KAS_KECIL', $date);
    expect($opnameNumber1)->toBe('001/KKCL/10435/IX/2026');

    $user = User::create([
        'store_id' => $store->id,
        'nik' => 'SAC999',
        'name' => 'SAC Test',
        'role' => 'SAC',
        'pin_hash' => 'hash',
        'is_active' => true,
    ]);

    CashOpnameSession::create([
        'store_id' => $store->id,
        'opname_number' => $opnameNumber1,
        'opname_type' => 'KAS_KECIL',
        'status' => 'DRAFT',
        'date' => '2026-09-25',
        'created_by_id' => $user->id,
    ]);

    $opnameNumber2 = $generator->generateOpnameNumber($store, 'KAS_KECIL', $date);
    expect($opnameNumber2)->toBe('002/KKCL/10435/IX/2026');
});
