<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BriSubLedger extends Model
{
    use HasCuid2, HasFactory;

    protected $fillable = [
        'session_id',
        'bri_mutation_total_cents',
        'b2b_allocation_cents',
        'event_allocation_cents',
        'aksel_allocation_cents',
        'anonymous_allocation_cents',
        'custom_allocations_total_cents',
        'statement_proof_url',
        'net_kas_kecil_bri_cents',
    ];

    protected function casts(): array
    {
        return [
            'bri_mutation_total_cents' => 'integer',
            'b2b_allocation_cents' => 'integer',
            'event_allocation_cents' => 'integer',
            'aksel_allocation_cents' => 'integer',
            'anonymous_allocation_cents' => 'integer',
            'custom_allocations_total_cents' => 'integer',
            'net_kas_kecil_bri_cents' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashOpnameSession::class, 'session_id');
    }

    public function customAllocations(): HasMany
    {
        return $this->hasMany(BriCustomAllocation::class, 'sub_ledger_id');
    }
}
