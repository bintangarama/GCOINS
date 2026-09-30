<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpnameItemDefinition extends Model
{
    use HasCuid2, HasFactory, HasStoreScope;

    protected $fillable = [
        'store_id',
        'opname_type',
        'label',
        'nominal_cents',
        'unit',
        'group_label',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'nominal_cents' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
