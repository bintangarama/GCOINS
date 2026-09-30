<?php

namespace App\Models\Concerns;

use App\Scopes\StoreScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait HasStoreScope
{
    /**
     * Boot the store scope trait.
     */
    protected static function bootHasStoreScope(): void
    {
        static::addGlobalScope(new StoreScope);

        static::creating(function ($model) {
            if (empty($model->store_id) && Auth::check() && Auth::user()?->store_id) {
                $model->store_id = Auth::user()->store_id;
            }
        });
    }

    /**
     * Scope a query to include all stores, ignoring StoreScope.
     */
    public function scopeWithoutStoreScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope(StoreScope::class);
    }
}
