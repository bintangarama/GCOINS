<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BriFundPosting extends Model
{
    use HasCuid2, HasFactory, HasStoreScope;

    public const CATEGORY_B2B = 'B2B';

    public const CATEGORY_EVENT = 'EVENT';

    public const CATEGORY_AKSEL = 'AKSEL';

    public const CATEGORY_ANONYMOUS = 'ANONYMOUS';

    public const CATEGORY_CUSTOM = 'CUSTOM';

    public const CATEGORIES = [
        self::CATEGORY_B2B,
        self::CATEGORY_EVENT,
        self::CATEGORY_AKSEL,
        self::CATEGORY_ANONYMOUS,
        self::CATEGORY_CUSTOM,
    ];

    public const TYPE_INFLOW = 'INFLOW';

    public const TYPE_OUTFLOW = 'OUTFLOW';

    public const TYPES = [
        self::TYPE_INFLOW,
        self::TYPE_OUTFLOW,
    ];

    public const STATUS_PENDING_SS = 'PENDING_SS';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_REJECTED = 'REJECTED';

    public const STATUSES = [
        self::STATUS_PENDING_SS,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    protected $fillable = [
        'store_id',
        'category',
        'custom_category_name',
        'entity_name',
        'type',
        'amount_cents',
        'purpose',
        'proof_attachment_url',
        'status',
        'created_by_id',
        'approved_by_id',
        'approved_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'entity_id')
            ->where('entity_type', 'BriFundPosting');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'entity_id')
            ->where('entity_name', 'BriFundPosting')
            ->latest();
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING_SS);
    }

    public function scopeInflow(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_INFLOW);
    }

    public function scopeOutflow(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_OUTFLOW);
    }

    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }
}
