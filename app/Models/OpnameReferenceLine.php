<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpnameReferenceLine extends Model
{
    use HasCuid2, HasFactory;

    public const LINE_Z_REPORT = 'Z_REPORT';

    public const LINE_BANK_DEPOSIT = 'BANK_DEPOSIT';

    public const LINE_PAYOUT = 'PAYOUT';

    public const LINE_STOCK_OPENING = 'STOCK_OPENING';

    public const LINE_STOCK_RECEIVED = 'STOCK_RECEIVED';

    public const LINE_STOCK_USED = 'STOCK_USED';

    public const LINE_STOCK_DAMAGED = 'STOCK_DAMAGED';

    public const LINE_CONSIGNMENT_SALES = 'CONSIGNMENT_SALES';

    public const LINE_EVENT_EXPENSE = 'EVENT_EXPENSE';

    public const LINE_STORE_REMITTANCE = 'STORE_REMITTANCE';

    public const LINE_SERIAL_RANGE = 'SERIAL_RANGE';

    protected $fillable = [
        'session_id',
        'line_type',
        'reference_number',
        'quantity',
        'amount_cents',
        'proof_attachment_url',
        'notes',
        'meta_json',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'amount_cents' => 'integer',
            'meta_json' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashOpnameSession::class, 'session_id');
    }
}
