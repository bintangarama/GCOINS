<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use App\Services\DocumentNumberGenerator;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportVouchersAction
{
    public function __construct(
        protected DocumentNumberGenerator $numberGenerator
    ) {}

    /**
     * Parse and validate spreadsheet for preview.
     *
     * @return array{valid_rows: array, error_rows: array, total: int}
     */
    public function preview(string $filePath, Store $store): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        array_shift($rows); // Remove header

        $validRows = [];
        $errorRows = [];

        $allowedCategories = [
            'OPERASIONAL',
            'STRUK_KASIR',
            'LOGISTIK',
            'KONSUMSI',
            'MAINTENANCE',
            'LAINNYA',
        ];

        $allowedStatuses = ['SETTLED', 'DISBURSED'];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;

            if (empty(array_filter($row, fn ($val) => ! is_null($val) && trim((string) $val) !== ''))) {
                continue;
            }

            $nik = trim((string) ($row[0] ?? ''));
            $amountRaw = trim((string) ($row[1] ?? ''));
            $purpose = trim((string) ($row[2] ?? ''));
            $category = strtoupper(trim((string) ($row[3] ?? '')));
            $dateStr = trim((string) ($row[4] ?? ''));
            $status = strtoupper(trim((string) ($row[5] ?? 'SETTLED')));

            $errors = [];

            // Check User
            $user = null;
            if ($nik === '') {
                $errors[] = 'NIK pemohon wajib diisi.';
            } else {
                $user = User::where('store_id', $store->id)->where('nik', $nik)->first();
                if (! $user) {
                    $errors[] = "User dengan NIK {$nik} tidak ditemukan di toko ini.";
                }
            }

            // Check Amount
            $amountNum = (int) preg_replace('/[^\d]/', '', $amountRaw);
            if ($amountNum <= 0) {
                $errors[] = 'Nominal harus bernilai angka lebih dari 0.';
            }

            // Check Purpose
            if ($purpose === '') {
                $errors[] = 'Keperluan voucher wajib diisi.';
            }

            // Check Category
            if (! in_array($category, $allowedCategories, true)) {
                $errors[] = 'Kategori tidak valid. Pilihan: '.implode(', ', $allowedCategories);
            }

            // Check Date
            $parsedDate = null;
            try {
                $parsedDate = $dateStr ? Carbon::parse($dateStr) : now();
            } catch (\Exception) {
                $errors[] = 'Format tanggal tidak valid (gunakan YYYY-MM-DD).';
            }

            // Check Status
            if (! in_array($status, $allowedStatuses, true)) {
                $errors[] = 'Status tidak valid. Pilihan untuk data historis: SETTLED, DISBURSED.';
            }

            $rowData = [
                'row_num' => $rowNum,
                'nik' => $nik,
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'amount_cents' => $amountNum * 100,
                'amount_rupiah' => $amountNum,
                'purpose' => $purpose,
                'category' => $category,
                'date' => $parsedDate ? $parsedDate->toDateString() : now()->toDateString(),
                'status' => $status,
            ];

            if (empty($errors)) {
                $validRows[] = $rowData;
            } else {
                $rowData['errors'] = $errors;
                $errorRows[] = $rowData;
            }
        }

        return [
            'valid_rows' => $validRows,
            'error_rows' => $errorRows,
            'total' => count($validRows) + count($errorRows),
        ];
    }

    /**
     * Commit valid rows to database.
     *
     * @param  array<array>  $validRows
     * @return int Number of vouchers created
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        return DB::transaction(function () use ($validRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;
            $voucherNumbers = [];

            foreach ($validRows as $row) {
                $date = Carbon::parse($row['date']);
                $voucherNumber = $this->numberGenerator->generateVoucherNumber($store, $date);

                $status = $row['status'];
                $isSettled = $status === 'SETTLED';

                $voucher = PettyCashVoucher::create([
                    'store_id' => $store->id,
                    'voucher_number' => $voucherNumber,
                    'requester_id' => $row['user_id'],
                    'amount_cents' => $row['amount_cents'],
                    'purpose' => $row['purpose'],
                    'category' => $row['category'],
                    'status' => $status,
                    'approved_by_id' => $performedBy->id,
                    'approved_at' => $date,
                    'disbursed_by_id' => $performedBy->id,
                    'disbursed_at' => $date,
                    'settled_at' => $isSettled ? $date : null,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);

                $voucherNumbers[] = $voucherNumber;
                $createdCount++;
            }

            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $store->id,
                'action' => 'IMPORT_VOUCHERS',
                'performed_by_id' => $performedBy->id,
                'old_values' => null,
                'new_values' => [
                    'count' => $createdCount,
                    'vouchers' => $voucherNumbers,
                ],
                'ip_address' => $ipAddress,
            ]);

            return $createdCount;
        });
    }
}
