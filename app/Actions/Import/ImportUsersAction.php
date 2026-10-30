<?php

namespace App\Actions\Import;

use App\Models\AuditLog;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportUsersAction
{
    /**
     * Get allowed roles that an actor can assign during user import.
     *
     * @return list<string>
     */
    protected function allowedRolesFor(?User $actor): array
    {
        if (! $actor) {
            return ['SM', 'SAC', 'SS', 'SOA'];
        }

        return match ($actor->role) {
            'SYSTEM_ADMIN', 'SM' => ['SM', 'SAC', 'SS', 'SOA'],
            'SAC' => ['SAC', 'SOA'],
            default => [],
        };
    }

    /**
     * Parse and validate spreadsheet for preview.
     *
     * @return array{valid_rows: array, error_rows: array, total: int}
     */
    public function preview(string $filePath, Store $store, ?User $actor = null): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        // Remove header row
        $header = array_shift($rows);

        $validRows = [];
        $errorRows = [];
        $seenNiks = [];
        $allowedRoles = $this->allowedRolesFor($actor);

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
            } elseif (strlen($nik) > 20) {
                $errors[] = 'NIK maksimal 20 karakter.';
            } elseif (in_array($nik, $seenNiks, true)) {
                $errors[] = 'NIK duplikat di dalam file ini.';
            } elseif (User::where('nik', $nik)->exists()) {
                $errors[] = 'NIK sudah terdaftar dalam sistem.';
            }

            if ($name === '') {
                $errors[] = 'Nama lengkap wajib diisi.';
            } elseif (strlen($name) > 100) {
                $errors[] = 'Nama lengkap maksimal 100 karakter.';
            }

            if (! in_array($role, $allowedRoles, true)) {
                $errors[] = 'Role tidak valid atau tidak diizinkan. Pilihan: '.implode(', ', $allowedRoles);
            }

            if (strlen($pin) < 6 || strlen($pin) > 10) {
                $errors[] = 'PIN awal harus 6 sampai 10 karakter.';
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
     *
     * @throws ValidationException
     */
    public function commit(array $validRows, Store $store, User $performedBy, ?string $ipAddress = null): int
    {
        $allowedRoles = $this->allowedRolesFor($performedBy);

        foreach ($validRows as $index => $row) {
            $nik = trim((string) ($row['nik'] ?? ''));
            $name = trim((string) ($row['name'] ?? ''));
            $role = strtoupper(trim((string) ($row['role'] ?? '')));
            $pin = (string) ($row['pin'] ?? '');

            if ($nik === '' || strlen($nik) > 20) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.nik" => 'NIK pada data impor tidak valid.',
                ]);
            }

            if ($name === '' || strlen($name) > 100) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.name" => 'Nama pengguna pada data impor tidak valid.',
                ]);
            }

            if (! in_array($role, $allowedRoles, true)) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.role" => "Anda tidak berwenang mengimpor pengguna dengan role {$role}.",
                ]);
            }

            if (strlen($pin) < 6 || strlen($pin) > 10) {
                throw ValidationException::withMessages([
                    "valid_rows.{$index}.pin" => 'PIN awal harus terdiri dari 6 hingga 10 karakter.',
                ]);
            }
        }

        return DB::transaction(function () use ($validRows, $store, $performedBy, $ipAddress) {
            $createdCount = 0;
            $importedNiks = [];

            foreach ($validRows as $row) {
                $nik = trim((string) $row['nik']);
                $name = trim((string) $row['name']);
                $role = strtoupper(trim((string) $row['role']));

                // Ensure double-check NIK does not exist
                if (User::where('nik', $nik)->exists()) {
                    continue;
                }

                $user = User::create([
                    'store_id' => $store->id,
                    'nik' => $nik,
                    'name' => $name,
                    'role' => $role,
                    'pin_hash' => Hash::make((string) $row['pin']),
                    'phone_number' => ! empty($row['phone_number']) ? trim((string) $row['phone_number']) : null,
                    'is_active' => true,
                ]);

                if (method_exists($user, 'assignRole')) {
                    $user->assignRole($role);
                }

                $importedNiks[] = $nik;
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
