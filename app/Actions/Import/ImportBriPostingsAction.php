<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportBriPostingsAction
{
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

        $allowedCategories = BriFundPosting::CATEGORIES;
        $allowedTypes = BriFundPosting::TYPES;

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;

            if (empty(array_filter($row, fn ($val) => ! is_null($val) && trim((string) $val) !== ''))) {
                continue;
            }

            $category = strtoupper(trim((string) ($row[0] ?? '')));
            $entityName = trim((string) ($row[1] ?? ''));
            $type = strtoupper(trim((string) ($row[2] ?? '')));
            $amountRaw = trim((string) ($row[3] ?? ''));
            $purpose = trim((string) ($row[4] ?? ''));
            $dateStr = trim((string) ($row[5] ?? ''));

            $errors = [];

            if (! in_array($category, $allowedCategories, true)) {
                $errors[] = 'Kategori tidak valid. Pilihan: '.implode(', ', $allowedCategories);
            }

            if ($entityName === '') {
                $errors[] = 'Nama entitas / mitra wajib diisi.';
            }

            if (! in_array($type, $allowedTypes, true)) {
                $errors[] = 'Tipe tidak valid. Pilihan: INFLOW, OUTFLOW.';
            }

            $amountNum = (int) preg_replace('/[^\d]/', '', $amountRaw);
            if ($amountNum <= 0) {
                $errors[] = 'Nominal harus bernilai angka lebih dari 0.';
            }

            if ($purpose === '') {
                $errors[] = 'Keperluan posting wajib diisi.';
            }

            $parsedDate = null;
            try {
                $parsedDate = $dateStr ? Carbon::parse($dateStr) : now();
            } catch (\Exception) {
                $errors[] = 'Format tanggal tidak valid (gunakan YYYY-MM-DD).';
            }

            $rowData = [
                'row_num' => $rowNum,
                'category' => $category,
                'entity_name' => $entityName,
                'type' => $type,
                'amount_cents' => $amountNum * 100,
                'amount_rupiah' => $amountNum,
                'purpose' => $purpose,
                'date' => $parsedDate ? $parsedDate->toDateString() : now()->toDateString(),
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
     * @return int Number of postings created
     *
     * @throws ValidationException
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        $allowedCategories = BriFundPosting::CATEGORIES;
        $allowedTypes = BriFundPosting::TYPES;
        $validatedRows = [];

        foreach ($validRows as $index => $row) {
            $category = strtoupper(trim((string) ($row['category'] ?? '')));
            if (! in_array($category, $allowedCategories, true)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.category" => 'Kategori mutasi BRI tidak valid.',
                ]);
            }

            $entityName = trim((string) ($row['entity_name'] ?? ''));
            if ($entityName === '' || strlen($entityName) > 100) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.entity_name" => 'Nama entitas/mitra wajib diisi (maksimal 100 karakter).',
                ]);
            }

            $type = strtoupper(trim((string) ($row['type'] ?? '')));
            if (! in_array($type, $allowedTypes, true)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.type" => 'Tipe mutasi BRI harus INFLOW atau OUTFLOW.',
                ]);
            }

            $amountCents = filter_var($row['amount_cents'] ?? null, FILTER_VALIDATE_INT);
            if ($amountCents === false || $amountCents <= 0) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.amount_cents" => 'Nominal mutasi BRI harus lebih dari 0.',
                ]);
            }

            $purpose = trim((string) ($row['purpose'] ?? ''));
            if ($purpose === '' || strlen($purpose) > 255) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.purpose" => 'Keperluan posting wajib diisi (maksimal 255 karakter).',
                ]);
            }

            try {
                $date = Carbon::parse((string) ($row['date'] ?? ''));
            } catch (\Exception) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.date" => 'Format tanggal mutasi BRI tidak valid.',
                ]);
            }

            $validatedRows[] = [
                'category' => $category,
                'entity_name' => $entityName,
                'type' => $type,
                'amount_cents' => $amountCents,
                'purpose' => $purpose,
                'date' => $date,
            ];
        }

        return DB::transaction(function () use ($validatedRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;

            foreach ($validatedRows as $row) {
                /** @var Carbon $date */
                $date = $row['date'];

                BriFundPosting::create([
                    'store_id' => $store->id,
                    'category' => $row['category'],
                    'entity_name' => $row['entity_name'],
                    'type' => $row['type'],
                    'amount_cents' => $row['amount_cents'],
                    'purpose' => $row['purpose'],
                    'status' => BriFundPosting::STATUS_APPROVED,
                    'created_by_id' => $performedBy->id,
                    'approved_by_id' => $performedBy->id,
                    'approved_at' => $date,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);

                $createdCount++;
            }

            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'BriFundPosting',
                'entity_id' => $store->id,
                'action' => 'IMPORT_BRI_POSTINGS',
                'performed_by_id' => $performedBy->id,
                'old_values' => null,
                'new_values' => [
                    'count' => $createdCount,
                ],
                'ip_address' => $ipAddress,
            ]);

            return $createdCount;
        });
    }
}
