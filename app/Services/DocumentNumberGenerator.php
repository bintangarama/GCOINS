<?php

namespace App\Services;

use App\Models\CashOpnameSession;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class DocumentNumberGenerator
{
    private const ROMAN_MONTHS = [
        1 => 'I',
        2 => 'II',
        3 => 'III',
        4 => 'IV',
        5 => 'V',
        6 => 'VI',
        7 => 'VII',
        8 => 'VIII',
        9 => 'IX',
        10 => 'X',
        11 => 'XI',
        12 => 'XII',
    ];

    private const OPNAME_TYPE_CODES = [
        CashOpnameSession::TYPE_KAS_KECIL => 'KKCL',
        CashOpnameSession::TYPE_KAS_BESAR => 'KBSR',
        CashOpnameSession::TYPE_ACTIVE_SELLING => 'AKSL',
        CashOpnameSession::TYPE_MATERAI => 'MATR',
        CashOpnameSession::TYPE_VOUCHER => 'VCHR',
    ];

    /**
     * Convert month integer (1-12) to Roman numeral.
     */
    public static function toRomanMonth(int $month): string
    {
        return self::ROMAN_MONTHS[$month] ?? 'I';
    }

    /**
     * Generate next voucher number for a store.
     * Format: {SEQ}/{TYPE_CODE}/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}
     * Example: 001/KKCL/10435/IX/2026
     */
    public function generateVoucherNumber(Store $store, ?CarbonInterface $date = null, string $typeCode = 'KKCL'): string
    {
        $date = $date ?? now();
        $month = $date->month;
        $year = $date->year;
        $romanMonth = self::toRomanMonth($month);
        $storeCode = $store->code;

        $prefixPattern = "/{$typeCode}/{$storeCode}/{$romanMonth}/{$year}";

        return DB::transaction(function () use ($store, $prefixPattern) {
            // Find highest sequence for this store and month/year (even including soft deleted)
            $latestVoucher = PettyCashVoucher::withoutGlobalScopes()
                ->withTrashed()
                ->where('store_id', $store->id)
                ->where('voucher_number', 'like', "%{$prefixPattern}")
                ->orderByRaw('CAST(SUBSTR(voucher_number, 1, INSTR(voucher_number, "/") - 1) AS INTEGER) DESC')
                ->first();

            $nextSeq = 1;
            if ($latestVoucher) {
                $parts = explode('/', $latestVoucher->voucher_number);
                $currentSeq = (int) ($parts[0] ?? 0);
                $nextSeq = $currentSeq + 1;
            }

            $seqPadded = str_pad((string) $nextSeq, 3, '0', STR_PAD_LEFT);

            return "{$seqPadded}{$prefixPattern}";
        });
    }

    /**
     * Generate next cash opname session number for a store.
     * Format: {SEQ}/{TYPE_CODE}/{STORE_CODE}/{ROMAN_MONTH}/{YEAR}
     * Example: 001/KKCL/10435/IX/2026
     */
    public function generateOpnameNumber(Store $store, string $opnameType = 'KAS_KECIL', ?CarbonInterface $date = null): string
    {
        $date = $date ?? now();
        $month = $date->month;
        $year = $date->year;
        $romanMonth = self::toRomanMonth($month);
        $storeCode = $store->code;
        $typeCode = self::OPNAME_TYPE_CODES[$opnameType] ?? 'KKCL';

        $prefixPattern = "/{$typeCode}/{$storeCode}/{$romanMonth}/{$year}";

        return DB::transaction(function () use ($store, $prefixPattern) {
            $latestSession = CashOpnameSession::withoutGlobalScopes()
                ->where('store_id', $store->id)
                ->where('opname_number', 'like', "%{$prefixPattern}")
                ->orderByRaw('CAST(SUBSTR(opname_number, 1, INSTR(opname_number, "/") - 1) AS INTEGER) DESC')
                ->first();

            $nextSeq = 1;
            if ($latestSession) {
                $parts = explode('/', $latestSession->opname_number);
                $currentSeq = (int) ($parts[0] ?? 0);
                $nextSeq = $currentSeq + 1;
            }

            $seqPadded = str_pad((string) $nextSeq, 3, '0', STR_PAD_LEFT);

            return "{$seqPadded}{$prefixPattern}";
        });
    }
}
