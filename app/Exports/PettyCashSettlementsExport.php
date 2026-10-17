<?php

namespace App\Exports;

use App\Models\PettyCashSettlement;
use App\Models\Store;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PettyCashSettlementsExport implements Export, WithEvents, WithTitle
{
    use Exportable;

    public const ACCOUNTING_FORMAT = '"Rp "#,##0;("Rp "#,##0);"Rp "-';

    /**
     * @param  array{date_from?: string, date_to?: string, search?: string}  $filters
     */
    public function __construct(
        protected ?string $storeId = null,
        protected array $filters = []
    ) {}

    public function title(): string
    {
        return 'Daftar Rekap Kas Kecil';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $this->buildSheet($event->sheet->getDelegate());
            },
        ];
    }

    protected function buildSheet(Worksheet $sheet): void
    {
        $pageSetup = $sheet->getPageSetup();
        $pageSetup->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $pageSetup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);

        // Column widths
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(14);
        $sheet->getColumnDimension('D')->setWidth(26);
        $sheet->getColumnDimension('E')->setWidth(26);
        $sheet->getColumnDimension('F')->setWidth(14);
        $sheet->getColumnDimension('G')->setWidth(22);
        $sheet->getColumnDimension('H')->setWidth(16);
        $sheet->getColumnDimension('I')->setWidth(24);
        $sheet->getColumnDimension('J')->setWidth(18);

        $store = $this->storeId ? Store::find($this->storeId) : null;
        $storeName = $store ? "{$store->name} ({$store->code})" : 'Semua Unit Toko';

        // Title Block
        $sheet->setCellValue('A1', 'DAFTAR REKAPITULASI PENGELUARAN KAS KECIL (KKCL)');
        $sheet->mergeCells('A1:J1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', "UNIT TOKO: {$storeName}");
        $sheet->mergeCells('A2:J2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10)->setColor(new Color('475569'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $dateFrom = $this->filters['date_from'] ?? 'Semua';
        $dateTo = $this->filters['date_to'] ?? 'Semua';
        $sheet->setCellValue('A4', "Filter Tanggal Selesai: {$dateFrom} s/d {$dateTo}");
        $sheet->mergeCells('A4:J4');
        $sheet->getStyle('A4')->getFont()->setItalic(true)->setSize(9);

        // Header Table
        $row = 6;
        $headers = [
            'A' => 'No',
            'B' => 'Nomor Rekap (Invoice KKCL)',
            'C' => 'Kode Toko',
            'D' => 'Nama Toko',
            'E' => 'Periode Transaksi Bon',
            'F' => 'Jumlah Bon',
            'G' => 'Total Pengeluaran (Rp)',
            'H' => 'Status',
            'I' => 'Diselesaikan Oleh',
            'J' => 'Tanggal Rekap',
        ];

        foreach ($headers as $col => $text) {
            $sheet->setCellValue("{$col}{$row}", $text);
        }

        $sheet->getStyle("A{$row}:J{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:J{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:J{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$row}:J{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row++;

        // Query
        $query = PettyCashSettlement::with(['store', 'settledBy'])->latest('settled_at');

        if ($this->storeId) {
            $query->where('store_id', $this->storeId);
        }
        if (! empty($this->filters['date_from'])) {
            $query->whereDate('settled_at', '>=', $this->filters['date_from']);
        }
        if (! empty($this->filters['date_to'])) {
            $query->whereDate('settled_at', '<=', $this->filters['date_to']);
        }
        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where('settlement_number', 'like', "%{$search}%");
        }

        $settlements = $query->get();
        $startDataRow = $row;

        if ($settlements->isNotEmpty()) {
            $counter = 1;
            foreach ($settlements as $item) {
                $periodFrom = $item->period_from ? Carbon::parse($item->period_from)->format('d/m/Y') : '-';
                $periodTo = $item->period_to ? Carbon::parse($item->period_to)->format('d/m/Y') : '-';

                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $item->settlement_number);
                $sheet->setCellValue("C{$row}", $item->store?->code ?? '-');
                $sheet->setCellValue("D{$row}", $item->store?->name ?? '-');
                $sheet->setCellValue("E{$row}", "{$periodFrom} - {$periodTo}");
                $sheet->setCellValue("F{$row}", $item->voucher_count);
                $sheet->setCellValue("G{$row}", $item->total_amount_cents / 100);
                $sheet->setCellValue("H{$row}", $item->status);
                $sheet->setCellValue("I{$row}", $item->settledBy?->name ?? '-');
                $sheet->setCellValue("J{$row}", $item->settled_at ? Carbon::parse($item->settled_at)->format('d/m/Y H:i') : '-');

                $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("H{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("J{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("A{$row}:J{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle("A{$row}:J{$row}")->getFont()->setSize(9);
                $row++;
            }
            $endDataRow = $row - 1;

            $sheet->setCellValue("F{$row}", 'TOTAL PENGELUARAN:');
            $sheet->setCellValue("G{$row}", "=SUM(G{$startDataRow}:G{$endDataRow})");
        } else {
            $sheet->setCellValue("A{$row}", 'Tidak ada data rekap settlement kas kecil.');
            $sheet->mergeCells("A{$row}:J{$row}");
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("A{$row}:J{$row}")->getFont()->setItalic(true)->setSize(9);
            $sheet->getStyle("A{$row}:J{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $row++;

            $sheet->setCellValue("F{$row}", 'TOTAL PENGELUARAN:');
            $sheet->setCellValue("G{$row}", 0);
        }

        $sheet->getStyle("F{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("G{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("A{$row}:J{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:J{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:J{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
    }
}
