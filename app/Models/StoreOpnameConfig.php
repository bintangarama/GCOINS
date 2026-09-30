<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreOpnameConfig extends Model
{
    use HasCuid2, HasFactory, HasStoreScope;

    protected $fillable = [
        'store_id',
        'opname_type',
        'imprest_fund_cents',
        'reconciliation_mode',
        'has_voucher_integration',
        'has_bank_reconciliation',
        'is_active',
        'config_json',
    ];

    protected function casts(): array
    {
        return [
            'imprest_fund_cents' => 'integer',
            'has_voucher_integration' => 'boolean',
            'has_bank_reconciliation' => 'boolean',
            'is_active' => 'boolean',
            'config_json' => 'array',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
