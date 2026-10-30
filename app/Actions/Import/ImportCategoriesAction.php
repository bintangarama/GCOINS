<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\PettyCashCategory;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportCategoriesAction
{
    /**
     * Parse and validate spreadsheet for preview.
     *
     * @return array{valid_rows: array, error_rows: array, total: int}
     */
    public function preview(string $filePath, Store $store, User $user): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getSheet(0);
        $rows = $sheet->toArray();

        array_shift($rows); // Remove header row

        $validRows = [];
        $errorRows = [];
        $seenCodes = [];

        // Existing codes in this store + global
        $existingCodes = PettyCashCategory::where(function ($q) use ($store) {
            $q->whereNull('store_id')->orWhere('store_id', $store->id);
        })->pluck('code')->map(fn ($c) => strtoupper($c))->toArray();

        $maxOrder = (int) PettyCashCategory::max('order');

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;

            if (empty(array_filter($row, fn ($val) => ! is_null($val) && trim((string) $val) !== ''))) {
                continue;
            }

            $rawCode = trim((string) ($row[0] ?? ''));
            $rawName = trim((string) ($row[1] ?? ''));
            $description = trim((string) ($row[2] ?? ''));
            $orderRaw = trim((string) ($row[3] ?? ''));
            $scopeRaw = strtoupper(trim((string) ($row[4] ?? 'TOKO')));

            $errors = [];

            // Format code: UPPERCASE, replace space/dash with underscore
            $code = strtoupper(preg_replace('/[\s\-]+/', '_', $rawCode));

            if ($code === '') {
                $errors[] = 'Kode kategori wajib diisi.';
            } elseif (! preg_match('/^[A-Z0-9_]+$/', $code)) {
                $errors[] = 'Kode hanya boleh berupa huruf kapital, angka, dan underscore.';
            } elseif (strlen($code) > 50) {
                $errors[] = 'Kode kategori maksimal 50 karakter.';
            } elseif (in_array($code, $seenCodes, true)) {
                $errors[] = "Kode kategori '{$code}' duplikat dalam file spreadsheet ini.";
            } elseif (in_array($code, $existingCodes, true)) {
                $errors[] = "Kode kategori '{$code}' sudah ada di database (global atau toko ini).";
            }

            // Name
            if ($rawName === '') {
                $errors[] = 'Nama kategori beban wajib diisi.';
            } elseif (strlen($rawName) > 100) {
                $errors[] = 'Nama kategori maksimal 100 karakter.';
            }

            // Order
            $order = $orderRaw !== '' && is_numeric($orderRaw) ? (int) $orderRaw : ++$maxOrder;

            // Scope permission
            $isGlobal = ($scopeRaw === 'GLOBAL');
            if ($isGlobal && $user->role !== 'SYSTEM_ADMIN') {
                $errors[] = 'Hanya SYSTEM_ADMIN yang diizinkan mengimpor kategori Global Nasional.';
            }

            $rowData = [
                'row_num' => $rowNum,
                'code' => $code,
                'name' => $rawName,
                'description' => $description ?: null,
                'order' => $order,
                'scope' => $isGlobal ? 'GLOBAL' : 'TOKO',
            ];

            if (empty($errors)) {
                $seenCodes[] = $code;
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
     * Commit validated rows to the database.
     *
     * @param  array<array>  $validRows
     *
     * @throws ValidationException
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        $existingCodes = PettyCashCategory::where(function ($q) use ($store) {
            $q->whereNull('store_id')->orWhere('store_id', $store->id);
        })->pluck('code')->map(fn ($c) => strtoupper((string) $c))->toArray();

        $seenCodes = [];
        $validatedRows = [];

        foreach ($validRows as $index => $row) {
            $code = strtoupper(trim((string) ($row['code'] ?? '')));
            $name = trim((string) ($row['name'] ?? ''));
            $description = isset($row['description']) ? trim((string) $row['description']) : null;
            $scope = strtoupper(trim((string) ($row['scope'] ?? 'TOKO')));
            $sortOrder = (int) ($row['sort_order'] ?? $row['order'] ?? 0);

            if ($code === '' || strlen($code) > 50 || ! preg_match('/^[A-Z0-9_]+$/', $code)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.code" => 'Kode kategori pada data impor tidak valid.',
                ]);
            }

            if (in_array($code, $seenCodes, true) || in_array($code, $existingCodes, true)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.code" => "Kode kategori '{$code}' duplikat atau sudah terdaftar.",
                ]);
            }

            if ($name === '' || strlen($name) > 100) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.name" => 'Nama kategori wajib diisi (maksimal 100 karakter).',
                ]);
            }

            if ($scope === 'GLOBAL' && $performedBy->role !== 'SYSTEM_ADMIN') {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.scope" => 'Hanya SYSTEM_ADMIN yang berwenang mengimpor kategori Global.',
                ]);
            }

            $seenCodes[] = $code;
            $validatedRows[] = [
                'store_id' => ($scope === 'GLOBAL' && $performedBy->role === 'SYSTEM_ADMIN') ? null : $store->id,
                'code' => $code,
                'name' => $name,
                'description' => $description !== '' ? $description : null,
                'sort_order' => max(0, $sortOrder),
            ];
        }

        return DB::transaction(function () use ($validatedRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;
            $categoryCodes = [];

            foreach ($validatedRows as $row) {
                PettyCashCategory::create([
                    'store_id' => $row['store_id'],
                    'code' => $row['code'],
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => true,
                ]);

                $categoryCodes[] = $row['code'];
                $createdCount++;
            }

            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'PettyCashCategory',
                'entity_id' => $store->id,
                'action' => 'IMPORT_CATEGORIES',
                'performed_by_id' => $performedBy->id,
                'old_values' => null,
                'new_values' => [
                    'count' => $createdCount,
                    'categories' => $categoryCodes,
                ],
                'ip_address' => $ipAddress,
            ]);

            return $createdCount;
        });
    }
}
