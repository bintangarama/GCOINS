<?php

namespace App\Exports;

use App\Models\BriFundPosting;
use App\Models\Store;
use App\Services\BriBalanceService;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BriPostingSummaryExport implements Export, WithMultipleSheets
{
    /**
     * @param  array{category?: string, entity_name?: string, type?: string, status?: string, date_from?: string, date_to?: string, search?: string}  $filters
     */
    public function __construct(
        protected string $storeId,
        protected array $filters = []
    ) {}

    public function sheets(): array
    {
        return [
            new BriPostingHistorySheet($this->storeId, $this->filters),
            new BriRunningBalanceSheet($this->storeId),
        ];
    }
}

class BriPostingHistorySheet implements Export, WithEvents, WithTitle
{
    public const ACCOUNTING_FORMAT = '"Rp "#,##0;("Rp "#,##0);"Rp "-';

    public function __construct(
        protected string $storeId,
        protected array $filters = []
    ) {}

    public function title(): string
    {
        return 'Riwayat Posting';
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

        $margins = $sheet->getPageMargins();
        $margins->setTop(0.5);
        $margins->setBottom(0.5);
        $margins->setLeft(0.5);
        $margins->setRight(0.5);

        // Column widths
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(18);
        $sheet->getColumnDimension('C')->setWidth(20);
        $sheet->getColumnDimension('D')->setWidth(16);
        $sheet->getColumnDimension('E')->setWidth(26);
        $sheet->getColumnDimension('F')->setWidth(14);
        $sheet->getColumnDimension('G')->setWidth(18);
        $sheet->getColumnDimension('H')->setWidth(30);
        $sheet->getColumnDimension('I')->setWidth(16);
        $sheet->getColumnDimension('J')->setWidth(20);
        $sheet->getColumnDimension('K')->setWidth(20);

        $store = Store::find($this->storeId);
        $storeName = $store?->name ?? 'Gramedia Store';
        $storeCode = $store?->code ?? '-';

        // Title Block
        $sheet->setCellValue('A1', 'LAPORAN RIWAYAT POSTING REKENING BRI');
        $sheet->mergeCells('A1:K1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', "UNIT TOKO: {$storeName} ({$storeCode})");
        $sheet->mergeCells('A2:K2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10)->setColor(new Color('475569'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $category = $this->filters['category'] ?? 'SEMUA';
        $type = $this->filters['type'] ?? 'SEMUA';
        $status = $this->filters['status'] ?? 'SEMUA';
        $sheet->setCellValue('A4', "Kategori: {$category} | Tipe: {$type} | Status: {$status} | Waktu Cetak: ".now()->format('d/m/Y H:i'));
        $sheet->mergeCells('A4:K4');
        $sheet->getStyle('A4')->getFont()->setItalic(true)->setSize(9);

        // Headers
        $row = 6;
        $headers = [
            'A' => 'No',
            'B' => 'Tanggal & Waktu',
            'C' => 'ID Posting',
            'D' => 'Kategori',
            'E' => 'Entitas / Kegiatan',
            'F' => 'Jenis',
            'G' => 'Nominal (Rp)',
            'H' => 'Keterangan / Keperluan',
            'I' => 'Status',
            'J' => 'Dibuat Oleh',
            'K' => 'Disetujui Oleh',
        ];

        foreach ($headers as $col => $title) {
            $sheet->setCellValue("{$col}{$row}", $title);
        }

        $sheet->getStyle("A{$row}:K{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:K{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:K{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$row}:K{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row++;

        // Query Postings
        $query = BriFundPosting::where('store_id', $this->storeId)
            ->with(['createdBy', 'approvedBy'])
            ->latest('created_at');

        if (! empty($this->filters['category']) && $this->filters['category'] !== 'ALL') {
            $query->where('category', $this->filters['category']);
        }
        if (! empty($this->filters['entity_name'])) {
            $query->where('entity_name', 'like', "%{$this->filters['entity_name']}%");
        }
        if (! empty($this->filters['type']) && $this->filters['type'] !== 'ALL') {
            $query->where('type', $this->filters['type']);
        }
        if (! empty($this->filters['status']) && $this->filters['status'] !== 'ALL') {
            $query->where('status', $this->filters['status']);
        }
        if (! empty($this->filters['date_from'])) {
            $query->whereDate('created_at', '>=', $this->filters['date_from']);
        }
        if (! empty($this->filters['date_to'])) {
            $query->whereDate('created_at', '<=', $this->filters['date_to']);
        }

        $postings = $query->get();
        $startDataRow = $row;

        if ($postings->isNotEmpty()) {
            $counter = 1;
            foreach ($postings as $p) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $p->created_at ? $p->created_at->format('d/m/Y H:i') : '-');
                $sheet->setCellValue("C{$row}", $p->id);
                $sheet->setCellValue("D{$row}", $p->category);
                $sheet->setCellValue("E{$row}", $p->entity_name);
                $sheet->setCellValue("F{$row}", $p->type);
                $sheet->setCellValue("G{$row}", $p->amount_cents / 100);
                $sheet->setCellValue("H{$row}", $p->purpose);
                $sheet->setCellValue("I{$row}", $p->status);
                $sheet->setCellValue("J{$row}", $p->createdBy?->name ?? '-');
                $sheet->setCellValue("K{$row}", $p->approvedBy?->name ?? '-');

                $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("I{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("A{$row}:K{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle("A{$row}:K{$row}")->getFont()->setSize(9);
                $row++;
            }
            $endDataRow = $row - 1;

            // Grand Total Row with native =SUM formula
            $sheet->setCellValue("F{$row}", 'TOTAL NOMINAL:');
            $sheet->setCellValue("G{$row}", "=SUM(G{$startDataRow}:G{$endDataRow})");
        } else {
            $sheet->setCellValue("A{$row}", 'Tidak ada data posting sesuai kriteria filter.');
            $sheet->mergeCells("A{$row}:K{$row}");
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("A{$row}:K{$row}")->getFont()->setItalic(true)->setSize(9);
            $sheet->getStyle("A{$row}:K{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $row++;

            $sheet->setCellValue("F{$row}", 'TOTAL NOMINAL:');
            $sheet->setCellValue("G{$row}", 0);
        }

        $sheet->getStyle("F{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("G{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("A{$row}:K{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:K{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:K{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
    }
}

class BriRunningBalanceSheet implements Export, WithEvents, WithTitle
{
    public const ACCOUNTING_FORMAT = '"Rp "#,##0;("Rp "#,##0);"Rp "-';

    public function __construct(
        protected string $storeId
    ) {}

    public function title(): string
    {
        return 'Saldo Berjalan';
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
        $pageSetup->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $pageSetup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);

        // Column widths
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(28);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(20);
        $sheet->getColumnDimension('F')->setWidth(22);

        $store = Store::find($this->storeId);
        $storeName = $store?->name ?? 'Gramedia Store';
        $storeCode = $store?->code ?? '-';

        // Title Block
        $sheet->setCellValue('A1', 'RINGKASAN SALDO BERJALAN SUB-LEDGER BRI');
        $sheet->mergeCells('A1:F1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', "UNIT TOKO: {$storeName} ({$storeCode})");
        $sheet->mergeCells('A2:F2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10)->setColor(new Color('475569'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A4', 'Status Saldo: APPROVED ONLY (Hanya transaksi yang telah disahkan) | Tanggal: '.now()->format('d/m/Y H:i'));
        $sheet->mergeCells('A4:F4');
        $sheet->getStyle('A4')->getFont()->setItalic(true)->setSize(9);

        // Headers
        $row = 6;
        $headers = [
            'A' => 'No',
            'B' => 'Kategori',
            'C' => 'Nama Entitas / Kegiatan',
            'D' => 'Total Inflow (Rp)',
            'E' => 'Total Outflow (Rp)',
            'F' => 'Saldo Akhir (Rp)',
        ];

        foreach ($headers as $col => $title) {
            $sheet->setCellValue("{$col}{$row}", $title);
        }

        $sheet->getStyle("A{$row}:F{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:F{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$row}:F{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row++;

        // Get entities with balances from BriBalanceService
        $service = app(BriBalanceService::class);
        $entities = $service->getEntitiesWithBalances($this->storeId);
        $startDataRow = $row;

        if ($entities->isNotEmpty()) {
            $counter = 1;
            foreach ($entities as $e) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $e['category']);
                $sheet->setCellValue("C{$row}", $e['entity_name']);
                $inflow = ($e['inflow_total_cents'] ?? $e['total_inflow_cents'] ?? 0) / 100;
                $outflow = ($e['outflow_total_cents'] ?? $e['total_outflow_cents'] ?? 0) / 100;
                $sheet->setCellValue("D{$row}", $inflow);
                $sheet->setCellValue("E{$row}", $outflow);
                // Native formula: =D - E
                $sheet->setCellValue("F{$row}", "=D{$row}-E{$row}");

                $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);

                $sheet->getStyle("A{$row}:F{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle("A{$row}:F{$row}")->getFont()->setSize(9);
                $row++;
            }
            $endDataRow = $row - 1;

            // Grand Total Row
            $sheet->setCellValue("C{$row}", 'TOTAL KESELURUHAN:');
            $sheet->setCellValue("D{$row}", "=SUM(D{$startDataRow}:D{$endDataRow})");
            $sheet->setCellValue("E{$row}", "=SUM(E{$startDataRow}:E{$endDataRow})");
            $sheet->setCellValue("F{$row}", "=D{$row}-E{$row}");
        } else {
            $sheet->setCellValue("A{$row}", 'Belum ada data transaksi sub-ledger BRI.');
            $sheet->mergeCells("A{$row}:F{$row}");
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("A{$row}:F{$row}")->getFont()->setItalic(true)->setSize(9);
            $sheet->getStyle("A{$row}:F{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $row++;

            $sheet->setCellValue("C{$row}", 'TOTAL KESELURUHAN:');
            $sheet->setCellValue("D{$row}", 0);
            $sheet->setCellValue("E{$row}", 0);
            $sheet->setCellValue("F{$row}", 0);
        }

        $sheet->getStyle("C{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("D{$row}:F{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("D{$row}:F{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("A{$row}:F{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:F{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:F{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
    }
}
