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

class VouchersImportTemplate implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    use Exportable;

    public function collection(): Collection
    {
        return collect([
            [
                '10435001',
                '150000',
                'Pembelian ATK dan Kertas Kasir',
                'OPERASIONAL',
                '2026-09-01',
                'SETTLED',
            ],
            [
                '10435002',
                '50000',
                'Bensin Motor Ekspedisi Toko',
                'LOGISTIK',
                '2026-09-02',
                'DISBURSED',
            ],
        ]);
    }

    public function headings(): array
    {
        return [
            'NIK Pemohon',
            'Nominal Rupiah (contoh: 150000)',
            'Keperluan',
            'Kategori (OPERASIONAL/STRUK_KASIR/LOGISTIK/KONSUMSI/MAINTENANCE/LAINNYA)',
            'Tanggal (YYYY-MM-DD)',
            'Status (SETTLED/DISBURSED)',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF2563EB'],
                ],
            ],
        ];
    }
}
