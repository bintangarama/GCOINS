<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpnameItemCount extends Model
{
    use HasCuid2, HasFactory;

    public const CONDITION_GOOD = 'GOOD';

    public const CONDITION_DAMAGED = 'DAMAGED';

    public const CONDITION_EXPIRED = 'EXPIRED';

    protected $fillable = [
        'session_id',
        'item_definition_id',
        'count',
        'subtotal_cents',
        'expected_count',
        'condition',
    ];

    protected function casts(): array
    {
        return [
            'count' => 'integer',
            'subtotal_cents' => 'integer',
            'expected_count' => 'integer',
            'condition' => 'string',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashOpnameSession::class, 'session_id');
    }

    public function itemDefinition(): BelongsTo
    {
        return $this->belongsTo(OpnameItemDefinition::class, 'item_definition_id');
    }
}
