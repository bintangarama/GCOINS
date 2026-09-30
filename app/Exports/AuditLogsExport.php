<?php

namespace App\Exports;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AuditLogsExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    use Exportable;

    public function __construct(
        protected ?string $storeId = null,
        protected ?string $entityName = null,
        protected ?string $action = null,
        protected ?string $search = null,
        protected ?string $dateFrom = null,
        protected ?string $dateTo = null
    ) {}

    public function query(): Builder
    {
        $query = AuditLog::with(['performedBy', 'store'])->latest('created_at');

        if ($this->storeId) {
            $query->where('store_id', $this->storeId);
        }

        if ($this->entityName) {
            $query->where('entity_name', $this->entityName);
        }

        if ($this->action) {
            $query->where('action', $this->action);
        }

        if ($this->dateFrom) {
            $query->whereDate('created_at', '>=', $this->dateFrom);
        }

        if ($this->dateTo) {
            $query->whereDate('created_at', '<=', $this->dateTo);
        }

        if ($this->search) {
            $search = $this->search;
            $query->where(function ($q) use ($search) {
                $q->where('entity_id', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhereHas('performedBy', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('nik', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'ID Log',
            'Kode Toko',
            'Waktu',
            'Pelaksana (Nama)',
            'NIK',
            'Role',
            'Modul / Entitas',
            'ID Entitas',
            'Tindakan (Action)',
            'Nilai Lama (JSON)',
            'Nilai Baru (JSON)',
            'IP Address',
        ];
    }

    /**
     * @param  AuditLog  $log
     */
    public function map($log): array
    {
        return [
            $log->id,
            $log->store?->code ?? 'GLOBAL',
            $log->created_at ? $log->created_at->format('Y-m-d H:i:s') : '',
            $log->performedBy?->name ?? 'Sistem',
            $log->performedBy?->nik ?? '-',
            $log->performedBy?->role ?? '-',
            $log->entity_name,
            $log->entity_id,
            $log->action,
            $log->old_values ? json_encode($log->old_values, JSON_UNESCAPED_UNICODE) : '',
            $log->new_values ? json_encode($log->new_values, JSON_UNESCAPED_UNICODE) : '',
            $log->ip_address ?? '-',
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
