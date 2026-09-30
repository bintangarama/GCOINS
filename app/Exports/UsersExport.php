<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class UsersExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    use Exportable;

    public function __construct(
        protected ?string $storeId = null,
        protected ?string $role = null,
        protected ?string $search = null
    ) {}

    public function query(): Builder
    {
        $query = User::with('store')->latest('created_at');

        if ($this->storeId) {
            $query->where('store_id', $this->storeId);
        }

        if ($this->role) {
            $query->where('role', $this->role);
        }

        if ($this->search) {
            $search = $this->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'ID User',
            'Kode Toko',
            'Nama Toko',
            'NIK',
            'Nama Lengkap',
            'Peran (Role)',
            'Nomor Telepon',
            'Status Aktif',
            'Tanggal Terdaftar',
        ];
    }

    /**
     * @param  User  $user
     */
    public function map($user): array
    {
        return [
            $user->id,
            $user->store?->code ?? 'GLOBAL',
            $user->store?->name ?? 'Pusat',
            $user->nik,
            $user->name,
            $user->role,
            $user->phone_number ?? '-',
            $user->is_active ? 'AKTIF' : 'NONAKTIF',
            $user->created_at ? $user->created_at->format('Y-m-d H:i:s') : '',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF1E293B'], // Slate-800
                ],
            ],
        ];
    }
}
