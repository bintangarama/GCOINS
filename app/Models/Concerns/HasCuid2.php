<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

trait HasCuid2
{
    protected static function bootHasCuid2(): void
    {
        static::creating(function ($model) {
            if (empty($model->getKey())) {
                $model->{$model->getKeyName()} = Str::cuid2();
            }
        });
    }

    public function getIncrementing(): bool
    {
        return false;
    }

    public function getKeyType(): string
    {
        return 'string';
    }
}
