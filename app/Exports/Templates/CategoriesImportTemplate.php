<?php

namespace App\Exports\Templates;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CategoriesImportTemplate implements Export, FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    use Exportable;

    public function collection(): Collection
    {
        return collect([
            [
                'RETRIBUSI_SAMPAH',
                'Retribusi Sampah & Kebersihan',
                'Iuran kebersihan lingkungan sekitar toko bulanan',
                '11',
                'TOKO',
            ],
            [
                'PARKIR_LANGGANAN',
                'Parkir Langganan Kendaraan',
                'Biaya parkir langganan kendaraan operasional toko',
                '12',
                'TOKO',
            ],
            [
                'AIR_MINUM_GALON',
                'Air Minum Galon & Pantry',
                'Pengadaan air galon dan kebutuhan pantry karyawan',
                '13',
                'TOKO',
            ],
        ]);
    }

    public function headings(): array
    {
        return [
            'Kode Kategori (Hanya Huruf Kapital, Angka, Garis Bawah)',
            'Nama Kategori Beban',
            'Deskripsi',
            'Urutan Kolom Matriks (Angka)',
            'Lingkup (TOKO / GLOBAL - khusus SYSTEM_ADMIN)',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF4F46E5'], // Indigo-600
                ],
            ],
        ];
    }
}
