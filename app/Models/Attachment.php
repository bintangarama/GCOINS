<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attachment extends Model
{
    use HasCuid2, HasFactory, HasStoreScope;

    public $timestamps = false;

    protected $fillable = [
        'store_id',
        'entity_type',
        'entity_id',
        'category',
        'file_name',
        'file_path',
        'file_size_bytes',
        'mime_type',
        'uploaded_by_id',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }
}
