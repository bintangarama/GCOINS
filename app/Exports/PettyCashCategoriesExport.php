<?php

namespace App\Exports;

use App\Models\PettyCashCategory;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PettyCashCategoriesExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use Exportable;

    public function __construct(
        protected ?string $storeId = null,
        protected ?string $scope = null, // 'all', 'global', 'store'
        protected ?bool $isActive = null
    ) {}

    public function title(): string
    {
        return 'Kategori Kas Kecil';
    }

    public function query(): Builder
    {
        $query = PettyCashCategory::with('store')->orderBy('order')->orderBy('code');

        if ($this->scope === 'global') {
            $query->global();
        } elseif ($this->scope === 'store' && $this->storeId) {
            $query->where('store_id', $this->storeId);
        } elseif ($this->storeId) {
            $query->forStore($this->storeId);
        }

        if (! is_null($this->isActive)) {
            $query->where('is_active', $this->isActive);
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'No. Urut',
            'Kode Kategori',
            'Nama Kategori Beban',
            'Deskripsi',
            'Lingkup Akses',
            'Unit Toko Pemilik',
            'Status',
            'Tanggal Dibuat',
        ];
    }

    /**
     * @param  PettyCashCategory  $category
     */
    public function map($category): array
    {
        return [
            $category->order,
            $category->code,
            $category->name,
            $category->description ?? '-',
            $category->store_id ? 'Khusus Toko' : 'Global Nasional',
            $category->store ? "{$category->store->code} - {$category->store->name}" : 'Semua Unit Toko (Pusat)',
            $category->is_active ? 'AKTIF' : 'NONAKTIF',
            $category->created_at ? $category->created_at->format('Y-m-d H:i') : '-',
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
