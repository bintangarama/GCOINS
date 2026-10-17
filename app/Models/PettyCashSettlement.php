<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PettyCashSettlement extends Model
{
    use HasCuid2, HasFactory, HasStoreScope;

    public const STATUS_SETTLED = 'SETTLED';

    protected $fillable = [
        'store_id',
        'settlement_number',
        'total_amount_cents',
        'status',
        'settled_by_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'total_amount_cents' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function settledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'settled_by_id');
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(PettyCashVoucher::class, 'settlement_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'entity_id')
            ->where('entity_name', 'PettyCashSettlement')
            ->latest();
    }
}
