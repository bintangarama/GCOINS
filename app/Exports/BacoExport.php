<?php

namespace App\Exports;

use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\PettyCashVoucher;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BacoExport implements Export, WithEvents, WithTitle
{
    public const ACCOUNTING_FORMAT = '"Rp "#,##0;("Rp "#,##0);"Rp "-';

    public function __construct(
        protected CashOpnameSession $session
    ) {}

    public function title(): string
    {
        return 'BACO';
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
        // 1. Page Setup: A4 Portrait, Narrow Margins, Fit to Page Width
        $pageSetup = $sheet->getPageSetup();
        $pageSetup->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $pageSetup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);

        $margins = $sheet->getPageMargins();
        $margins->setTop(0.25);
        $margins->setBottom(0.25);
        $margins->setLeft(0.25);
        $margins->setRight(0.25);

        // Column widths
        $sheet->getColumnDimension('A')->setWidth(7);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(18);
        $sheet->getColumnDimension('D')->setWidth(14);
        $sheet->getColumnDimension('E')->setWidth(22);

        // Load relations if not already loaded
        $session = $this->session;
        $session->loadMissing([
            'store',
            'createdBy',
            'verifiedBySs',
            'approvedBySm',
            'itemCounts.itemDefinition',
            'subLedger.customAllocations',
        ]);

        $storeName = $session->store?->name ?? 'Gramedia Store';
        $storeCode = $session->store?->code ?? '-';

        // 2. Document Title & Store Header
        $sheet->setCellValue('A1', 'BERITA ACARA CASH OPNAME (BACO)');
        $sheet->mergeCells('A1:E1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', "PT GRAMEDIA ASRI MEDIA — UNIT TOKO {$storeName} ({$storeCode})");
        $sheet->mergeCells('A2:E2');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10)->setColor(new Color('475569'));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Metadata block (Rows 4-6)
        $sheet->setCellValue('A4', 'No. Dokumen:');
        $sheet->setCellValue('B4', $session->opname_number);
        $sheet->setCellValue('D4', 'Tanggal Opname:');
        $sheet->setCellValue('E4', $session->date ? $session->date->format('d/m/Y') : '-');

        $sheet->setCellValue('A5', 'Jenis Opname:');
        $sheet->setCellValue('B5', $session->opname_type);
        $sheet->setCellValue('D5', 'Status Sesi:');
        $sheet->setCellValue('E5', $session->status);

        $sheet->setCellValue('A6', 'Plafon Imprest:');
        $sheet->setCellValue('B6', $session->imprest_fund_cents / 100);
        $sheet->getStyle('B6')->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->setCellValue('D6', 'Waktu Cetak:');
        $sheet->setCellValue('E6', now()->format('d/m/Y H:i'));

        $sheet->getStyle('A4:A6')->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle('D4:D6')->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle('B4:B6')->getFont()->setSize(9);
        $sheet->getStyle('E4:E6')->getFont()->setSize(9);

        $row = 8;

        // ==========================================
        // SECTION 1: KAS FISIK BRANKAS (K_fisik)
        // ==========================================
        $sheet->setCellValue("A{$row}", '1. KANTONG 1: PERHITUNGAN FISIK KAS BRANKAS (K_fisik)');
        $sheet->mergeCells("A{$row}:E{$row}");
        $this->styleSectionHeader($sheet, "A{$row}:E{$row}");
        $row++;

        // Table column headers
        $sheet->setCellValue("A{$row}", 'No');
        $sheet->setCellValue("B{$row}", 'Pecahan / Uraian');
        $sheet->setCellValue("C{$row}", 'Nilai Pecahan (Rp)');
        $sheet->setCellValue("D{$row}", 'Jumlah (Lembar/Kpg)');
        $sheet->setCellValue("E{$row}", 'Subtotal (Rp)');
        $this->styleTableHeader($sheet, "A{$row}:E{$row}");
        $row++;

        // Group item counts
        $items = $session->itemCounts->sortBy(function ($item) {
            return $item->itemDefinition?->sort_order ?? 99;
        });

        $paperItems = $items->filter(fn ($item) => ($item->itemDefinition?->group_label ?? '') === 'Uang Kertas');
        $coinItems = $items->filter(fn ($item) => ($item->itemDefinition?->group_label ?? '') === 'Uang Logam');
        $otherItems = $items->filter(fn ($item) => ! in_array($item->itemDefinition?->group_label ?? '', ['Uang Kertas', 'Uang Logam'], true));

        $subtotalCells = [];

        // --- Uang Kertas ---
        if ($paperItems->isNotEmpty()) {
            $sheet->setCellValue("A{$row}", 'Uang Kertas');
            $sheet->mergeCells("A{$row}:E{$row}");
            $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setItalic(true);
            $sheet->getStyle("A{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F8FAFC');
            $row++;

            $startRow = $row;
            $counter = 1;
            foreach ($paperItems as $item) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $item->itemDefinition?->label ?? 'Pecahan Kertas');
                $sheet->setCellValue("C{$row}", ($item->itemDefinition?->nominal_cents ?? 0) / 100);
                $sheet->setCellValue("D{$row}", (int) $item->count);
                // Native formula: =C*D
                $sheet->setCellValue("E{$row}", "=C{$row}*D{$row}");

                $this->styleDataRow($sheet, $row);
                $row++;
            }
            $endRow = $row - 1;

            // Subtotal Kertas
            $sheet->setCellValue("B{$row}", 'Subtotal Uang Kertas');
            $sheet->setCellValue("E{$row}", "=SUM(E{$startRow}:E{$endRow})");
            $this->styleSubtotalRow($sheet, $row);
            $subtotalCells[] = "E{$row}";
            $row++;
        }

        // --- Uang Logam ---
        if ($coinItems->isNotEmpty()) {
            $sheet->setCellValue("A{$row}", 'Uang Logam');
            $sheet->mergeCells("A{$row}:E{$row}");
            $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setItalic(true);
            $sheet->getStyle("A{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F8FAFC');
            $row++;

            $startRow = $row;
            $counter = 1;
            foreach ($coinItems as $item) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $item->itemDefinition?->label ?? 'Pecahan Logam');
                $sheet->setCellValue("C{$row}", ($item->itemDefinition?->nominal_cents ?? 0) / 100);
                $sheet->setCellValue("D{$row}", (int) $item->count);
                // Native formula: =C*D
                $sheet->setCellValue("E{$row}", "=C{$row}*D{$row}");

                $this->styleDataRow($sheet, $row);
                $row++;
            }
            $endRow = $row - 1;

            // Subtotal Logam
            $sheet->setCellValue("B{$row}", 'Subtotal Uang Logam');
            $sheet->setCellValue("E{$row}", "=SUM(E{$startRow}:E{$endRow})");
            $this->styleSubtotalRow($sheet, $row);
            $subtotalCells[] = "E{$row}";
            $row++;
        }

        // Other items if any
        if ($otherItems->isNotEmpty()) {
            $sheet->setCellValue("A{$row}", 'Item Lainnya');
            $sheet->mergeCells("A{$row}:E{$row}");
            $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setItalic(true);
            $row++;

            $startRow = $row;
            $counter = 1;
            foreach ($otherItems as $item) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $item->itemDefinition?->label ?? 'Item');
                $sheet->setCellValue("C{$row}", ($item->itemDefinition?->nominal_cents ?? 0) / 100);
                $sheet->setCellValue("D{$row}", (int) $item->count);
                $sheet->setCellValue("E{$row}", "=C{$row}*D{$row}");

                $this->styleDataRow($sheet, $row);
                $row++;
            }
            $endRow = $row - 1;

            $sheet->setCellValue("B{$row}", 'Subtotal Item Lainnya');
            $sheet->setCellValue("E{$row}", "=SUM(E{$startRow}:E{$endRow})");
            $this->styleSubtotalRow($sheet, $row);
            $subtotalCells[] = "E{$row}";
            $row++;
        }

        // Grand Total K_fisik
        $fisikFormula = ! empty($subtotalCells) ? '='.implode('+', $subtotalCells) : '=0';
        $sheet->setCellValue("B{$row}", 'TOTAL KAS FISIK BRANKAS (K_fisik)');
        $sheet->setCellValue("E{$row}", $fisikFormula);
        $this->styleGrandTotalRow($sheet, $row);
        $kFisikRow = $row;
        $row += 2;

        // ==========================================
        // SECTION 2: BON KAS KECIL GANTUNG (K_bon)
        // ==========================================
        $sheet->setCellValue("A{$row}", '2. KANTONG 2: VOUCHER BON KAS KECIL GANTUNG (K_bon)');
        $sheet->mergeCells("A{$row}:E{$row}");
        $this->styleSectionHeader($sheet, "A{$row}:E{$row}");
        $row++;

        $sheet->setCellValue("A{$row}", 'No');
        $sheet->setCellValue("B{$row}", 'No. Voucher');
        $sheet->setCellValue("C{$row}", 'Pemohon & Keperluan');
        $sheet->setCellValue("D{$row}", 'Kategori');
        $sheet->setCellValue("E{$row}", 'Nominal (Rp)');
        $this->styleTableHeader($sheet, "A{$row}:E{$row}");
        $row++;

        // Retrieve disbursed vouchers
        $disbursedVouchers = $this->getDisbursedVouchers();

        if (! empty($disbursedVouchers)) {
            $startVRow = $row;
            $vIdx = 1;
            foreach ($disbursedVouchers as $v) {
                $sheet->setCellValue("A{$row}", $vIdx++);
                $sheet->setCellValue("B{$row}", $v['voucher_number'] ?? '-');
                $requesterName = $v['requester']['name'] ?? ($v['requester_name'] ?? 'Staff');
                $purpose = $v['purpose'] ?? '-';
                $sheet->setCellValue("C{$row}", "{$requesterName} — {$purpose}");
                $sheet->setCellValue("D{$row}", $v['category'] ?? '-');
                $sheet->setCellValue("E{$row}", ($v['amount_cents'] ?? 0) / 100);

                $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
                $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(9);
                $row++;
            }
            $endVRow = $row - 1;

            $sheet->setCellValue("B{$row}", 'TOTAL BON KAS KECIL GANTUNG (K_bon)');
            $sheet->setCellValue("E{$row}", "=SUM(E{$startVRow}:E{$endVRow})");
        } else {
            $sheet->setCellValue("B{$row}", 'Nihil — Tidak ada bon kas kecil gantung yang aktif');
            $sheet->setCellValue("E{$row}", 0);
            $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
            $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(9);
            $nihilRow = $row;
            $row++;

            $sheet->setCellValue("B{$row}", 'TOTAL BON KAS KECIL GANTUNG (K_bon)');
            $sheet->setCellValue("E{$row}", "=E{$nihilRow}");
        }

        $this->styleGrandTotalRow($sheet, $row);
        $kBonRow = $row;
        $row += 2;

        // ==========================================
        // SECTION 3: REKONSILIASI KAS BRI (K_bri)
        // ==========================================
        $sheet->setCellValue("A{$row}", '3. KANTONG 3: REKONSILIASI KAS KECIL BANK BRI (K_bri)');
        $sheet->mergeCells("A{$row}:E{$row}");
        $this->styleSectionHeader($sheet, "A{$row}:E{$row}");
        $row++;

        $subLedger = $session->subLedger;
        $mutationBalance = ($subLedger?->bri_mutation_total_cents ?? 0) / 100;

        // Row 3.1: Mutation balance
        $sheet->setCellValue("A{$row}", '3.1');
        $sheet->setCellValue("B{$row}", 'Saldo Mutasi Rekening Koran BRI');
        $sheet->setCellValue("E{$row}", $mutationBalance);
        $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $briMutasiRow = $row;
        $row++;

        // Subheader: Allocations
        $sheet->setCellValue("A{$row}", '3.2');
        $sheet->setCellValue("B{$row}", 'Alokasi Dana Non-Kas Kecil (Pengurang):');
        $sheet->mergeCells("B{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setItalic(true)->setSize(9);
        $sheet->getStyle("A{$row}:E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F8FAFC');
        $row++;

        $allocStartRow = $row;
        $allocations = [
            'B2B (School/Corporate Books)' => ($subLedger?->b2b_allocation_cents ?? 0) / 100,
            'Event & Exhibition (Bazaar)' => ($subLedger?->event_allocation_cents ?? 0) / 100,
            'Active Selling (Aksel)' => ($subLedger?->aksel_allocation_cents ?? 0) / 100,
            'Anonymous Transfer' => ($subLedger?->anonymous_allocation_cents ?? 0) / 100,
            'Custom Allocations (Lainnya)' => ($subLedger?->custom_allocations_total_cents ?? 0) / 100,
        ];

        foreach ($allocations as $label => $val) {
            $sheet->setCellValue("B{$row}", "- {$label}");
            $sheet->setCellValue("E{$row}", $val);
            $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
            $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(9);
            $row++;
        }
        $allocEndRow = $row - 1;

        // Subtotal Allocations
        $sheet->setCellValue("B{$row}", 'Total Alokasi Non-Kas Kecil');
        $sheet->setCellValue("E{$row}", "=SUM(E{$allocStartRow}:E{$allocEndRow})");
        $this->styleSubtotalRow($sheet, $row);
        $allocSubtotalRow = $row;
        $row++;

        // Net K_bri: Mutation - Allocations
        $sheet->setCellValue("B{$row}", 'TOTAL KAS KECIL BANK BRI (K_bri)');
        $sheet->setCellValue("E{$row}", "=E{$briMutasiRow}-E{$allocSubtotalRow}");
        $this->styleGrandTotalRow($sheet, $row);
        $kBriRow = $row;
        $row += 2;

        // ==========================================
        // SECTION 4: REKAPITULASI & HASIL SELISIH
        // ==========================================
        $sheet->setCellValue("A{$row}", '4. REKAPITULASI & HASIL REKONSILIASI SELISIH');
        $sheet->mergeCells("A{$row}:E{$row}");
        $this->styleSectionHeader($sheet, "A{$row}:E{$row}");
        $row++;

        // 4.1 Total Kas Aktual
        $sheet->setCellValue("A{$row}", '4.1');
        $sheet->setCellValue("B{$row}", 'TOTAL KAS AKTUAL (K_fisik + K_bon + K_bri)');
        $sheet->setCellValue("E{$row}", "=E{$kFisikRow}+E{$kBonRow}+E{$kBriRow}");
        $this->styleSubtotalRow($sheet, $row);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true)->setSize(10);
        $totalActualRow = $row;
        $row++;

        // 4.2 Plafon Imprest
        $sheet->setCellValue("A{$row}", '4.2');
        $sheet->setCellValue("B{$row}", 'Plafon Kas Tetap (Imprest Fund)');
        $sheet->setCellValue("E{$row}", $session->imprest_fund_cents / 100);
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(9);
        $imprestRow = $row;
        $row++;

        // 4.3 Selisih Periode Lalu (V_prev)
        $sheet->setCellValue("A{$row}", '4.3');
        $sheet->setCellValue("B{$row}", 'Selisih Periode Sebelumnya (V_prev)');
        $sheet->setCellValue("E{$row}", $session->previous_variance_cents / 100);
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(9);
        $vPrevRow = $row;
        $row++;

        // Target Rekonsiliasi (Plafon + V_prev)
        $sheet->setCellValue("B{$row}", 'TARGET REKONSILIASI (Plafon + V_prev)');
        $sheet->setCellValue("E{$row}", "=E{$imprestRow}+E{$vPrevRow}");
        $this->styleSubtotalRow($sheet, $row);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true)->setSize(10);
        $targetReconciledRow = $row;
        $row++;

        // Final Variance: Total Actual - Target Reconciled
        $sheet->setCellValue("B{$row}", 'SELISIH KAS (V_current = Aktual - Target)');
        $sheet->setCellValue("E{$row}", "=E{$totalActualRow}-E{$targetReconciledRow}");
        $this->styleGrandTotalRow($sheet, $row);
        $sheet->getStyle("B{$row}:E{$row}")->getFont()->setSize(11)->setBold(true);
        $sheet->getStyle("E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FEF08A'); // yellow accent
        $varianceRow = $row;
        $row++;

        // Status Badge Row
        $sheet->setCellValue("B{$row}", 'STATUS HASIL OPNAME:');
        $sheet->setCellValue("E{$row}", $session->variance_status);
        $sheet->getStyle("B{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("E{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        if ($session->variance_status === CashOpnameSession::VARIANCE_BALANCED) {
            $sheet->getStyle("E{$row}")->getFont()->setColor(new Color('15803D'));
        } elseif ($session->variance_status === CashOpnameSession::VARIANCE_SURPLUS) {
            $sheet->getStyle("E{$row}")->getFont()->setColor(new Color('1D4ED8'));
        } else {
            $sheet->getStyle("E{$row}")->getFont()->setColor(new Color('B91C1C'));
        }
        $row++;

        if ($session->notes) {
            $sheet->setCellValue("B{$row}", 'Catatan SM: "'.$session->notes.'"');
            $sheet->mergeCells("B{$row}:E{$row}");
            $sheet->getStyle("B{$row}")->getFont()->setItalic(true)->setSize(9);
            $row++;
        }

        $row++;

        // ==========================================
        // SECTION 5: SIGN-OFF (TANDA TANGAN & PENGESAHAN)
        // ==========================================
        $sheet->setCellValue("A{$row}", '5. PENGESAHAN & TANDA TANGAN BERITA ACARA');
        $sheet->mergeCells("A{$row}:E{$row}");
        $this->styleSectionHeader($sheet, "A{$row}:E{$row}");
        $row++;

        // Signature column headers
        $sheet->setCellValue("A{$row}", "Dibuat Oleh,\n(Kasir / SAC)");
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", "Diverifikasi Saksi,\n(Store Supervisor / SS)");
        $sheet->setCellValue("D{$row}", "Disetujui Final,\n(Store Manager / SM)");
        $sheet->mergeCells("D{$row}:E{$row}");

        $sheet->getStyle("A{$row}:E{$row}")->getAlignment()->setWrapText(true);
        $sheet->getStyle("A{$row}:E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F1F5F9');
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getRowDimension($row)->setRowHeight(28);
        $row++;

        // Signature blank space (height for wet signature)
        $signStart = $row;
        $signEnd = $row + 2;
        $sheet->mergeCells("A{$signStart}:B{$signEnd}");
        $sheet->mergeCells("C{$signStart}:C{$signEnd}");
        $sheet->mergeCells("D{$signStart}:E{$signEnd}");
        $sheet->getStyle("A{$signStart}:E{$signEnd}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row = $signEnd + 1;

        // Name and NIK data from session
        $sacName = $session->createdBy?->name ?? '..................................';
        $sacNik = $session->createdBy?->nik ?? '..................................';
        $sacDate = $session->created_at ? $session->created_at->format('d/m/Y H:i') : '-';

        $ssName = $session->verifiedBySs?->name ?? ($session->status === CashOpnameSession::STATUS_DRAFT ? '(Menunggu pengajuan)' : '..................................');
        $ssNik = $session->verifiedBySs?->nik ?? '-';
        $ssDate = $session->verified_ss_at ? $session->verified_ss_at->format('d/m/Y H:i') : '-';

        $smName = $session->approvedBySm?->name ?? ($session->status !== CashOpnameSession::STATUS_APPROVED ? '(Menunggu persetujuan)' : '..................................');
        $smNik = $session->approvedBySm?->nik ?? '-';
        $smDate = $session->approved_sm_at ? $session->approved_sm_at->format('d/m/Y H:i') : '-';

        // Name
        $sheet->setCellValue("A{$row}", "Nama: {$sacName}");
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", "Nama: {$ssName}");
        $sheet->setCellValue("D{$row}", "Nama: {$smName}");
        $sheet->mergeCells("D{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row++;

        // NIK
        $sheet->setCellValue("A{$row}", "NIK: {$sacNik}");
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", "NIK: {$ssNik}");
        $sheet->setCellValue("D{$row}", "NIK: {$smNik}");
        $sheet->mergeCells("D{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(8);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $row++;

        // Date
        $sheet->setCellValue("A{$row}", "Waktu: {$sacDate}");
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", "Waktu: {$ssDate}");
        $sheet->setCellValue("D{$row}", "Waktu: {$smDate}");
        $sheet->mergeCells("D{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(8)->setColor(new Color('64748B'));
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    }

    /**
     * Retrieve disbursed vouchers (either from AuditLog immutable snapshot or database).
     *
     * @return array<int, array<string, mixed>>
     */
    protected function getDisbursedVouchers(): array
    {
        $session = $this->session;

        if ($session->status === CashOpnameSession::STATUS_APPROVED) {
            $audit = AuditLog::where('entity_id', $session->id)
                ->where('action', 'SIGN_OFF_SM')
                ->latest()
                ->first();

            if (! empty($audit?->new_values['snapshot']['vouchers_disbursed'])) {
                return $audit->new_values['snapshot']['vouchers_disbursed'];
            }
        }

        return PettyCashVoucher::where('store_id', $session->store_id)
            ->where('status', PettyCashVoucher::STATUS_DISBURSED)
            ->with('requester:id,name,nik')
            ->latest()
            ->get(['id', 'voucher_number', 'requester_id', 'purpose', 'amount_cents', 'category', 'disbursed_at'])
            ->toArray();
    }

    protected function styleSectionHeader(Worksheet $sheet, string $cellRange): void
    {
        $sheet->getStyle($cellRange)->getFont()->setBold(true)->setSize(10)->setColor(new Color('0F172A'));
        $sheet->getStyle($cellRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle($cellRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    }

    protected function styleTableHeader(Worksheet $sheet, string $cellRange): void
    {
        $sheet->getStyle($cellRange)->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle($cellRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F1F5F9');
        $sheet->getStyle($cellRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle($cellRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    }

    protected function styleDataRow(Worksheet $sheet, int $row): void
    {
        $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_NUMBER);
        $sheet->getStyle("D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setSize(9);
    }

    protected function styleSubtotalRow(Worksheet $sheet, int $row): void
    {
        $sheet->getStyle("B{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("E{$row}")->getFont()->setBold(true)->setSize(9);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F8FAFC');
    }

    protected function styleGrandTotalRow(Worksheet $sheet, int $row): void
    {
        $sheet->getStyle("B{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode(self::ACCOUNTING_FORMAT);
        $sheet->getStyle("E{$row}")->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle("A{$row}:E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_DOUBLE);
    }
}
