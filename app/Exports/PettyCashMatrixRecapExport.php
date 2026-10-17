<?php

namespace App\Exports;

use App\Models\PettyCashCategory;
use App\Models\PettyCashSettlement;
use App\Models\User;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PettyCashMatrixRecapExport implements Export, WithEvents, WithTitle
{
    public const ACCOUNTING_FORMAT = '#,##0;(#,##0);"-"';

    public function __construct(
        protected PettyCashSettlement $settlement
    ) {}

    public function title(): string
    {
        return 'Rekap Kas Kecil';
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
        // 1. Page Setup: A4 Landscape, Fit to width
        $pageSetup = $sheet->getPageSetup();
        $pageSetup->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $pageSetup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);

        $margins = $sheet->getPageMargins();
        $margins->setTop(0.4);
        $margins->setBottom(0.4);
        $margins->setLeft(0.4);
        $margins->setRight(0.4);

        $settlement = $this->settlement->loadMissing(['store', 'settledBy', 'vouchers.requester']);
        $store = $settlement->store;
        $storeName = $store?->name ?? 'Gramedia Store';
        $storeAddress = $store?->address ?? '';
        $storeCode = $store?->code ?? 'STORE';

        // 2. Fetch categories for this store
        $dbCategories = PettyCashCategory::forStore($settlement->store_id)
            ->active()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['code', 'name']);

        // Collect distinct voucher categories from this settlement
        $voucherCategoryCodes = $settlement->vouchers->pluck('category')->unique();

        $categoryMap = [];
        foreach ($dbCategories as $cat) {
            $categoryMap[$cat->code] = $cat->name;
        }
        foreach ($voucherCategoryCodes as $vCode) {
            if (! isset($categoryMap[$vCode])) {
                $categoryMap[$vCode] = $vCode;
            }
        }

        $orderedCategoryCodes = array_keys($categoryMap);

        // Header info:
        // Row 1: Store Name
        $sheet->setCellValue('A1', $storeName);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(11);

        // Row 2: Address
        if (! empty($storeAddress)) {
            $sheet->setCellValue('A2', $storeAddress);
            $sheet->getStyle('A2')->getFont()->setSize(9)->setColor(new Color('334155'));
        }

        // Row 4: Title & Inv Number
        $sheet->setCellValue('A4', 'Rekap pengeluaran kas kecil');
        $sheet->getStyle('A4')->getFont()->setBold(true)->setSize(11);

        // Compute total columns:
        // Col 1: Tanggal (A)
        // Col 2: Employee Id (B)
        // Col 3.. 3+count(categories)-1: Category columns
        // Next Col: Keterangan
        // Next Col: Total (optional summary)
        $totalCategoryCols = count($orderedCategoryCodes);
        $keteranganColIndex = 3 + $totalCategoryCols;
        $keteranganColLetter = Coordinate::stringFromColumnIndex($keteranganColIndex);

        $sheet->setCellValue("{$keteranganColLetter}4", "No. inv : {$settlement->settlement_number}");
        $sheet->getStyle("{$keteranganColLetter}4")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("{$keteranganColLetter}4")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Row 6: Table Headers
        $headerRow = 6;
        $sheet->setCellValue("A{$headerRow}", 'Tanggal');
        $sheet->setCellValue("B{$headerRow}", 'Employee Id');

        $colIdx = 3;
        $categoryColMap = [];
        foreach ($orderedCategoryCodes as $cCode) {
            $colLetter = Coordinate::stringFromColumnIndex($colIdx);
            $sheet->setCellValue("{$colLetter}{$headerRow}", $categoryMap[$cCode]);
            $categoryColMap[$cCode] = $colLetter;
            $sheet->getColumnDimension($colLetter)->setWidth(15);
            $colIdx++;
        }

        $sheet->setCellValue("{$keteranganColLetter}{$headerRow}", 'Keterangan');

        // Column widths for base columns
        $sheet->getColumnDimension('A')->setWidth(13);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension($keteranganColLetter)->setWidth(38);

        // Style header row
        $lastColLetter = $keteranganColLetter;
        $sheet->getStyle("A{$headerRow}:{$lastColLetter}{$headerRow}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$headerRow}:{$lastColLetter}{$headerRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);
        $sheet->getStyle("A{$headerRow}:{$lastColLetter}{$headerRow}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F1F5F9');
        $sheet->getStyle("A{$headerRow}:{$lastColLetter}{$headerRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getRowDimension($headerRow)->setRowHeight(26);

        // Row 7+: Data rows
        $dataRow = $headerRow + 1;
        $startDataRow = $dataRow;

        $vouchers = $settlement->vouchers->sortBy('created_at');

        foreach ($vouchers as $voucher) {
            $voucherDate = $voucher->receipt_date ?? $voucher->disbursed_at ?? $voucher->created_at;
            $formattedDate = $voucherDate ? $voucherDate->format('d-M-y') : '-';

            $requesterName = $voucher->requester?->name ?? '-';
            $requesterNik = $voucher->requester?->nik ? " {$voucher->requester->nik}" : '';
            $employeeId = trim("{$requesterName}{$requesterNik}");

            $sheet->setCellValue("A{$dataRow}", $formattedDate);
            $sheet->setCellValue("B{$dataRow}", $employeeId);

            // Put amount under its category column
            $targetCol = $categoryColMap[$voucher->category] ?? null;
            if ($targetCol) {
                $sheet->setCellValue("{$targetCol}{$dataRow}", $voucher->amount_cents / 100);
            }

            $sheet->setCellValue("{$keteranganColLetter}{$dataRow}", $voucher->purpose);

            // Alignment & borders
            $sheet->getStyle("A{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("B{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle("{$keteranganColLetter}{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

            for ($c = 3; $c <= 2 + $totalCategoryCols; $c++) {
                $cL = Coordinate::stringFromColumnIndex($c);
                $sheet->getStyle("{$cL}{$dataRow}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("{$cL}{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            }

            $sheet->getStyle("A{$dataRow}:{$lastColLetter}{$dataRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle("A{$dataRow}:{$lastColLetter}{$dataRow}")->getFont()->setSize(8.5);

            $dataRow++;
        }

        $endDataRow = $dataRow - 1;

        // Total Row
        $sheet->setCellValue("A{$dataRow}", 'TOTAL');
        $sheet->mergeCells("A{$dataRow}:B{$dataRow}");
        $sheet->getStyle("A{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$dataRow}:B{$dataRow}")->getFont()->setBold(true)->setSize(9);

        for ($c = 3; $c <= 2 + $totalCategoryCols; $c++) {
            $cL = Coordinate::stringFromColumnIndex($c);
            if ($endDataRow >= $startDataRow) {
                $sheet->setCellValue("{$cL}{$dataRow}", "=SUM({$cL}{$startDataRow}:{$cL}{$endDataRow})");
            } else {
                $sheet->setCellValue("{$cL}{$dataRow}", 0);
            }
            $sheet->getStyle("{$cL}{$dataRow}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
            $sheet->getStyle("{$cL}{$dataRow}")->getFont()->setBold(true)->setSize(9);
            $sheet->getStyle("{$cL}{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        }

        // Grand Total at bottom right
        $sheet->setCellValue("{$keteranganColLetter}{$dataRow}", $settlement->total_amount_cents / 100);
        $sheet->getStyle("{$keteranganColLetter}{$dataRow}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("{$keteranganColLetter}{$dataRow}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("{$keteranganColLetter}{$dataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->getStyle("A{$dataRow}:{$lastColLetter}{$dataRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$dataRow}:{$lastColLetter}{$dataRow}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');

        // Footer / Signatures
        $signRow = $dataRow + 2;

        $createdDateStr = $settlement->created_at
            ? $settlement->created_at->translatedFormat('d F Y')
            : now()->translatedFormat('d F Y');

        $cityName = 'Karawang';
        if (preg_match('/(Jakarta|Bandung|Surabaya|Semarang|Yogyakarta|Karawang|Bekasi|Bogor|Depok|Tangerang)/i', $storeName, $m)) {
            $cityName = $m[1];
        }

        $sheet->setCellValue("B{$signRow}", "{$cityName}, {$createdDateStr}");
        $sheet->getStyle("B{$signRow}")->getFont()->setSize(9);
        $signRow++;

        $sheet->setCellValue("B{$signRow}", 'Penyusun');
        $sheet->setCellValue("E{$signRow}", 'Mengetahui');
        $sheet->getStyle("B{$signRow}")->getFont()->setSize(9);
        $sheet->getStyle("E{$signRow}")->getFont()->setSize(9);

        // Find Store Manager name
        $smUser = User::where('store_id', $settlement->store_id)->where('role', 'SM')->first();
        $smName = $smUser?->name ?? 'Store Manager';
        $sacName = $settlement->settledBy?->name ?? 'Store Administrative Clerk';

        $nameRow = $signRow + 4;
        $sheet->setCellValue("B{$nameRow}", strtoupper($sacName));
        $sheet->getStyle("B{$nameRow}")->getFont()->setBold(true)->setUnderline(true)->setSize(9);

        $sheet->setCellValue("E{$nameRow}", strtoupper($smName));
        $sheet->getStyle("E{$nameRow}")->getFont()->setBold(true)->setUnderline(true)->setSize(9);

        $roleRow = $nameRow + 1;
        $sheet->setCellValue("B{$roleRow}", 'Store Administrative Clerk');
        $sheet->getStyle("B{$roleRow}")->getFont()->setSize(8);

        $sheet->setCellValue("E{$roleRow}", 'Store Manager');
        $sheet->getStyle("E{$roleRow}")->getFont()->setSize(8);
    }
}
