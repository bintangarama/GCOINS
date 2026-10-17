<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PettyCashCategory extends Model
{
    use HasCuid2, HasFactory;

    protected $fillable = [
        'store_id',
        'code',
        'name',
        'description',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function isGlobal(): bool
    {
        return $this->store_id === null;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeGlobal(Builder $query): Builder
    {
        return $query->whereNull('store_id');
    }

    public function scopeCustom(Builder $query): Builder
    {
        return $query->whereNotNull('store_id');
    }

    /**
     * Scope query to include global categories and categories specific to the given store.
     */
    public function scopeForStore(Builder $query, ?string $storeId = null): Builder
    {
        return $query->where(function (Builder $q) use ($storeId) {
            $q->whereNull('store_id');
            if ($storeId) {
                $q->orWhere('store_id', $storeId);
            }
        });
    }
}
