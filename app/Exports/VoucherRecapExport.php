<?php

namespace App\Exports;

use App\Models\PettyCashVoucher;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class VoucherRecapExport implements Export, WithEvents, WithTitle
{
    public const ACCOUNTING_FORMAT = '"Rp "#,##0;("Rp "#,##0);"Rp "-';

    /**
     * @param  array{status?: string, category?: string, requester_id?: string, date_from?: string, date_to?: string, search?: string}  $filters
     */
    public function __construct(
        protected string $storeId,
        protected array $filters = []
    ) {}

    public function title(): string
    {
        return 'Rekap Voucher';
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
        // 1. Page Setup: A4 Landscape, fit to page width
        $pageSetup = $sheet->getPageSetup();
        $pageSetup->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $pageSetup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);

        $margins = $sheet->getPageMargins();
        $margins->setTop(0.5);
        $margins->setBottom(0.5);
        $margins->setLeft(0.5);
        $margins->setRight(0.5);

        // Column widths
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(24);
        $sheet->getColumnDimension('C')->setWidth(18);
        $sheet->getColumnDimension('D')->setWidth(22);
        $sheet->getColumnDimension('E')->setWidth(14);
        $sheet->getColumnDimension('F')->setWidth(30);
        $sheet->getColumnDimension('G')->setWidth(16);
        $sheet->getColumnDimension('H')->setWidth(18);
        $sheet->getColumnDimension('I')->setWidth(16);
        $sheet->getColumnDimension('J')->setWidth(18);
        $sheet->getColumnDimension('K')->setWidth(18);
        $sheet->getColumnDimension('L')->setWidth(20);

        $store = Store::find($this->storeId);
        $storeName = $store?->name ?? 'Gramedia Store';
        $storeCode = $store?->code ?? '-';

        // Title Block
        $sheet->setCellValue('A1', 'REKAPITULASI VOUCHER BON KAS KECIL');
        $sheet->mergeCells('A1:L1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', "UNIT TOKO: {$storeName} ({$storeCode})");
        $sheet->mergeCells('A2:L2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10)->setColor(new Color('475569'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Filter details
        $dateFrom = $this->filters['date_from'] ?? 'Semua';
        $dateTo = $this->filters['date_to'] ?? 'Semua';
        $status = $this->filters['status'] ?? 'SEMUA';
        $category = $this->filters['category'] ?? 'SEMUA';

        $sheet->setCellValue('A4', "Periode: {$dateFrom} s/d {$dateTo} | Status: {$status} | Kategori: {$category}");
        $sheet->mergeCells('A4:L4');
        $sheet->getStyle('A4')->getFont()->setItalic(true)->setSize(9);

        // Header Table
        $row = 6;
        $headers = [
            'A' => 'No',
            'B' => 'No. Voucher',
            'C' => 'Tanggal Pengajuan',
            'D' => 'Nama Pemohon',
            'E' => 'NIK Pemohon',
            'F' => 'Keperluan',
            'G' => 'Kategori',
            'H' => 'Nominal (Rp)',
            'I' => 'Status',
            'J' => 'Tgl Pencairan',
            'J' => 'Tgl Pencairan',
            'K' => 'Tgl Selesai',
            'L' => 'Disetujui Oleh',
        ];

        foreach ($headers as $col => $text) {
            $sheet->setCellValue("{$col}{$row}", $text);
        }

        $sheet->getStyle("A{$row}:L{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:L{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:L{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$row}:L{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row++;

        // Query Vouchers
        $query = PettyCashVoucher::where('store_id', $this->storeId)
            ->with(['requester', 'approvedBy', 'disbursedBy'])
            ->latest('created_at');

        if (! empty($this->filters['status']) && $this->filters['status'] !== 'ALL') {
            $query->where('status', $this->filters['status']);
        }
        if (! empty($this->filters['category']) && $this->filters['category'] !== 'ALL') {
            $query->where('category', $this->filters['category']);
        }
        if (! empty($this->filters['requester_id']) && $this->filters['requester_id'] !== 'ALL') {
            $query->where('requester_id', $this->filters['requester_id']);
        }
        if (! empty($this->filters['date_from'])) {
            $query->whereDate('created_at', '>=', $this->filters['date_from']);
        }
        if (! empty($this->filters['date_to'])) {
            $query->whereDate('created_at', '<=', $this->filters['date_to']);
        }
        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('voucher_number', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%");
            });
        }

        $vouchers = $query->get();
        $startDataRow = $row;

        if ($vouchers->isNotEmpty()) {
            $counter = 1;
            foreach ($vouchers as $v) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $v->voucher_number);
                $sheet->setCellValue("C{$row}", $v->created_at ? $v->created_at->format('d/m/Y H:i') : '-');
                $sheet->setCellValue("D{$row}", $v->requester?->name ?? '-');
                $sheet->setCellValue("E{$row}", $v->requester?->nik ?? '-');
                $sheet->setCellValue("F{$row}", $v->purpose);
                $sheet->setCellValue("G{$row}", $v->category);
                $sheet->setCellValue("H{$row}", $v->amount_cents / 100);
                $sheet->setCellValue("I{$row}", $v->status);
                $sheet->setCellValue("J{$row}", $v->disbursed_at ? $v->disbursed_at->format('d/m/Y H:i') : '-');
                $sheet->setCellValue("K{$row}", $v->settled_at ? $v->settled_at->format('d/m/Y H:i') : '-');
                $sheet->setCellValue("L{$row}", $v->approvedBy?->name ?? '-');

                $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("H{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("I{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("J{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("K{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("A{$row}:L{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle("A{$row}:L{$row}")->getFont()->setSize(9);
                $row++;
            }
            $endDataRow = $row - 1;

            // Grand Total Row with native =SUM formula
            $sheet->setCellValue("G{$row}", 'TOTAL NOMINAL:');
            $sheet->setCellValue("H{$row}", "=SUM(H{$startDataRow}:H{$endDataRow})");
        } else {
            $sheet->setCellValue("A{$row}", 'Tidak ada data voucher sesuai kriteria filter.');
            $sheet->mergeCells("A{$row}:L{$row}");
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("A{$row}:L{$row}")->getFont()->setItalic(true)->setSize(9);
            $sheet->getStyle("A{$row}:L{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $row++;

            $sheet->setCellValue("G{$row}", 'TOTAL NOMINAL:');
            $sheet->setCellValue("H{$row}", 0);
        }

        $sheet->getStyle("G{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("H{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("H{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("A{$row}:L{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:L{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:L{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
    }
}
