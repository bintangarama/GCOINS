<?php

namespace App\Exports\Templates;

use App\Models\PettyCashCategory;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class VouchersImportTemplate implements Export, WithMultipleSheets
{
    use Exportable;

    public function __construct(
        protected ?string $storeId = null
    ) {}

    public function sheets(): array
    {
        return [
            new VouchersDataSheet,
            new CategoriesReferenceSheet($this->storeId),
        ];
    }
}

class VouchersDataSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function title(): string
    {
        return 'Format Data Voucher';
    }

    public function collection(): Collection
    {
        return collect([
            [
                '10435001',
                '150000',
                'Pembelian ATK dan Kertas Kasir',
                'KERTAS_FORMULIR',
                '2026-09-01',
                'SETTLED',
            ],
            [
                '10435002',
                '50000',
                'Bensin Motor Ekspedisi Toko',
                'BBM_MOTOR',
                '2026-09-02',
                'DISBURSED',
            ],
            [
                '10435003',
                '75000',
                'Konsumsi Tamu & Kebersihan Toko',
                'KEP_RT',
                '2026-09-03',
                'DISBURSED',
            ],
            [
                '10435004',
                '200000',
                'Biaya Ekspedisi / Pengiriman Paket',
                'ONGKIR',
                '2026-09-04',
                'SETTLED',
            ],
        ]);
    }

    public function headings(): array
    {
        return [
            'NIK Pemohon',
            'Nominal Rupiah (contoh: 150000)',
            'Keperluan',
            'Kategori (lihat sheet "Daftar Kategori")',
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
                    'startColor' => ['argb' => 'FF2563EB'], // Primary Blue
                ],
            ],
        ];
    }
}

class CategoriesReferenceSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function __construct(
        protected ?string $storeId = null
    ) {}

    public function title(): string
    {
        return 'Daftar Kategori';
    }

    public function collection(): Collection
    {
        $query = PettyCashCategory::query()->active()->orderBy('order');

        if ($this->storeId) {
            $query->forStore($this->storeId);
        }

        $categories = $query->get();

        if ($categories->isEmpty()) {
            return collect([
                ['BDL', 'BDL', 'Beban Dinas Luar', 'Global'],
                ['BBM_MOBIL', 'BBM Mobil', 'Bahan Bakar Mobil Operasional', 'Global'],
                ['BBM_MOTOR', 'BBM Motor', 'Bahan Bakar Motor Ekspedisi Toko', 'Global'],
                ['KERTAS_FORMULIR', 'Kertas & Formulir', 'Kertas Struk Kasir, Continuous Form, ATK Toko', 'Global'],
                ['BIAYA_PEMASARAN', 'Biaya Pemasaran', 'Beban Promosi & Marketing Toko', 'Global'],
                ['IKLAN', 'Iklan', 'Beban Iklan & Publikasi Lokal', 'Global'],
                ['ONGKIR', 'Ongkos Kirim', 'Ekspedisi Pengiriman Barang Pelanggan/Toko', 'Global'],
                ['EMBALLAGE', 'Emballage', 'Bahan Pembungkus, Lakban, Bubble Wrap, Kardus', 'Global'],
                ['KEP_RT', 'Kep. Rumah Tangga', 'Keperluan RT Toko, Konsumsi, Pantry, Sanitasi', 'Global'],
                ['LAINNYA', 'Lain-lain', 'Pengeluaran kas kecil lainnya', 'Global'],
            ]);
        }

        return $categories->map(function ($cat) {
            return [
                $cat->code,
                $cat->name,
                $cat->description ?? '-',
                $cat->store_id ? 'Khusus Toko' : 'Global Nasional',
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Kode Kategori (Gunakan kode ini di kolom Kategori)',
            'Nama Kategori Beban',
            'Deskripsi',
            'Lingkup Kategori',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF059669'], // Emerald-600
                ],
            ],
        ];
    }
}
