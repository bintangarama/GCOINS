<?php

namespace App\Exports\Templates;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class UsersImportTemplate implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    use Exportable;

    public function collection(): Collection
    {
        return collect([
            [
                '10435001',
                'Budi Santoso',
                'SAC',
                '081234567890',
                '123456',
            ],
            [
                '10435002',
                'Siti Aminah',
                'SS',
                '081298765432',
                '654321',
            ],
            [
                '10435003',
                'Rian Pratama',
                'SOA',
                '081311223344',
                '112233',
            ],
        ]);
    }

    public function headings(): array
    {
        return [
            'NIK',
            'Nama Lengkap',
            'Role (SM/SAC/SS/SOA)',
            'Nomor Telepon',
            'PIN Awal (min 6 digit)',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF2563EB'], // Blue-600
                ],
            ],
        ];
    }
}
