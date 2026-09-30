<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
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
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        return DB::transaction(function () use ($validRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;

            foreach ($validRows as $row) {
                $date = Carbon::parse($row['date']);

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
