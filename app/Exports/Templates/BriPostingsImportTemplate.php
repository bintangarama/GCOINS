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

class BriPostingsImportTemplate implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    use Exportable;

    public function collection(): Collection
    {
        return collect([
            [
                'B2B',
                'PT Penerbit Erlangga',
                'INFLOW',
                '2500000',
                'Pelunasan Pesanan Buku Sekolah',
                '2026-09-01',
            ],
            [
                'EVENT',
                'Bazar Buku Gramedia Expo',
                'INFLOW',
                '1000000',
                'Uang Muka Stand Pameran',
                '2026-09-02',
            ],
            [
                'B2B',
                'PT Penerbit Erlangga',
                'OUTFLOW',
                '500000',
                'Koreksi Retur Pembayaran',
                '2026-09-03',
            ],
        ]);
    }

    public function headings(): array
    {
        return [
            'Kategori (B2B/EVENT/AKSEL/ANONYMOUS/CUSTOM)',
            'Nama Entitas / Mitra',
            'Tipe (INFLOW/OUTFLOW)',
            'Nominal Rupiah (contoh: 2500000)',
            'Keperluan',
            'Tanggal (YYYY-MM-DD)',
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
