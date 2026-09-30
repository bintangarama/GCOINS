<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BriCustomAllocation extends Model
{
    use HasCuid2, HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'sub_ledger_id',
        'name',
        'amount_cents',
        'notes',
        'proof_attachment_url',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function subLedger(): BelongsTo
    {
        return $this->belongsTo(BriSubLedger::class, 'sub_ledger_id');
    }
}
