<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\PettyCashCategory;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\User;
use App\Services\DocumentNumberGenerator;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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
        $sheet = $spreadsheet->getSheet(0);
        $rows = $sheet->toArray();

        array_shift($rows); // Remove header

        $validRows = [];
        $errorRows = [];

        // Build category lookup map (code and normalized names)
        $categories = PettyCashCategory::forStore($store->id)->active()->get();
        $categoryLookup = [];
        foreach ($categories as $cat) {
            $catCode = strtoupper(trim($cat->code));
            $categoryLookup[$catCode] = $cat->code;
            $categoryLookup[strtoupper(preg_replace('/[\s\-]+/', '_', trim($cat->code)))] = $cat->code;
            $categoryLookup[strtoupper(trim($cat->name))] = $cat->code;
            $categoryLookup[strtoupper(preg_replace('/[\s\-]+/', '_', trim($cat->name)))] = $cat->code;
        }

        // Support legacy categories as fallback
        foreach (PettyCashVoucher::CATEGORIES as $legacyCode) {
            $categoryLookup[strtoupper($legacyCode)] = $legacyCode;
        }

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
            $resolvedCategory = null;
            $normalizedCategoryKey = strtoupper(preg_replace('/[\s\-]+/', '_', $category));

            if (isset($categoryLookup[$category])) {
                $resolvedCategory = $categoryLookup[$category];
            } elseif (isset($categoryLookup[$normalizedCategoryKey])) {
                $resolvedCategory = $categoryLookup[$normalizedCategoryKey];
            } else {
                $validOptions = array_values(array_unique($categoryLookup));
                sort($validOptions);
                $errors[] = 'Kategori tidak valid: "'.($category ?: '-').'". Pilihan: '.implode(', ', $validOptions);
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
                'category' => $resolvedCategory ?? $category,
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
     *
     * @throws ValidationException
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        $allowedStatuses = ['SETTLED', 'DISBURSED'];
        $validCategories = PettyCashCategory::forStore($store->id)
            ->active()
            ->pluck('code')
            ->merge(PettyCashVoucher::CATEGORIES)
            ->map(fn ($c) => strtoupper((string) $c))
            ->unique()
            ->all();

        $validatedRows = [];

        foreach ($validRows as $index => $row) {
            $userId = $row['user_id'] ?? null;
            $nik = trim((string) ($row['nik'] ?? ''));

            $requester = User::where('store_id', $store->id)
                ->when($userId, fn ($q) => $q->where('id', $userId))
                ->when(! $userId && $nik !== '', fn ($q) => $q->where('nik', $nik))
                ->first();

            if (! $requester) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.user_id" => 'Pemohon voucher tidak ditemukan di toko ini.',
                ]);
            }

            $amountCents = filter_var($row['amount_cents'] ?? null, FILTER_VALIDATE_INT);
            if ($amountCents === false || $amountCents <= 0) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.amount_cents" => 'Nominal voucher harus berupa bilangan bulat lebih dari 0.',
                ]);
            }

            $purpose = trim((string) ($row['purpose'] ?? ''));
            if ($purpose === '' || strlen($purpose) > 255) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.purpose" => 'Keperluan voucher wajib diisi (maksimal 255 karakter).',
                ]);
            }

            $category = strtoupper(trim((string) ($row['category'] ?? '')));
            if (! in_array($category, $validCategories, true)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.category" => "Kategori voucher '{$category}' tidak valid.",
                ]);
            }

            $status = strtoupper(trim((string) ($row['status'] ?? '')));
            if (! in_array($status, $allowedStatuses, true)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.status" => 'Status voucher impor hanya boleh SETTLED atau DISBURSED.',
                ]);
            }

            try {
                $date = Carbon::parse((string) ($row['date'] ?? ''));
            } catch (\Exception) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.date" => 'Format tanggal voucher tidak valid.',
                ]);
            }

            $validatedRows[] = [
                'requester_id' => $requester->id,
                'amount_cents' => $amountCents,
                'purpose' => $purpose,
                'category' => $category,
                'status' => $status,
                'date' => $date,
            ];
        }

        return DB::transaction(function () use ($validatedRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;
            $voucherNumbers = [];

            foreach ($validatedRows as $row) {
                /** @var Carbon $date */
                $date = $row['date'];
                $voucherNumber = $this->numberGenerator->generateVoucherNumber($store, $date);

                $status = $row['status'];
                $isSettled = $status === 'SETTLED';

                PettyCashVoucher::create([
                    'store_id' => $store->id,
                    'voucher_number' => $voucherNumber,
                    'requester_id' => $row['requester_id'],
                    'amount_cents' => $row['amount_cents'],
                    'receipt_date' => $date->toDateString(),
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
