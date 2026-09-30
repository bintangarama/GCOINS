<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportUsersAction
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

        // Remove header row
        $header = array_shift($rows);

        $validRows = [];
        $errorRows = [];
        $seenNiks = [];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // 1-indexed Excel row

            // Ignore empty rows
            if (empty(array_filter($row, fn ($val) => ! is_null($val) && trim((string) $val) !== ''))) {
                continue;
            }

            $nik = trim((string) ($row[0] ?? ''));
            $name = trim((string) ($row[1] ?? ''));
            $role = strtoupper(trim((string) ($row[2] ?? '')));
            $phone = trim((string) ($row[3] ?? ''));
            $pin = trim((string) ($row[4] ?? ''));

            $errors = [];

            if ($nik === '') {
                $errors[] = 'NIK wajib diisi.';
            } elseif (in_array($nik, $seenNiks, true)) {
                $errors[] = 'NIK duplikat di dalam file ini.';
            } elseif (User::where('nik', $nik)->exists()) {
                $errors[] = 'NIK sudah terdaftar dalam sistem.';
            }

            if ($name === '') {
                $errors[] = 'Nama lengkap wajib diisi.';
            }

            $allowedRoles = ['SM', 'SAC', 'SS', 'SOA'];
            if (! in_array($role, $allowedRoles, true)) {
                $errors[] = 'Role tidak valid. Pilihan: '.implode(', ', $allowedRoles);
            }

            if (strlen($pin) < 6) {
                $errors[] = 'PIN awal minimal 6 karakter.';
            }

            $rowData = [
                'row_num' => $rowNum,
                'nik' => $nik,
                'name' => $name,
                'role' => $role,
                'phone_number' => $phone ?: null,
                'pin' => $pin,
            ];

            if (empty($errors)) {
                $seenNiks[] = $nik;
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
     * @return int Number of users created
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        return DB::transaction(function () use ($validRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;
            $importedNiks = [];

            foreach ($validRows as $row) {
                // Ensure double-check NIK does not exist
                if (User::where('nik', $row['nik'])->exists()) {
                    continue;
                }

                $user = User::create([
                    'store_id' => $store->id,
                    'nik' => $row['nik'],
                    'name' => $row['name'],
                    'role' => $row['role'],
                    'pin_hash' => Hash::make($row['pin']),
                    'phone_number' => $row['phone_number'] ?? null,
                    'is_active' => true,
                ]);

                if (method_exists($user, 'assignRole')) {
                    $user->assignRole($row['role']);
                }

                $importedNiks[] = $row['nik'];
                $createdCount++;
            }

            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'User',
                'entity_id' => $store->id,
                'action' => 'IMPORT_USERS',
                'performed_by_id' => $performedBy->id,
                'old_values' => null,
                'new_values' => [
                    'count' => $createdCount,
                    'niks' => $importedNiks,
                ],
                'ip_address' => $ipAddress,
            ]);

            return $createdCount;
        });
    }
}
