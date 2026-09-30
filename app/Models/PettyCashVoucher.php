<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PettyCashVoucher extends Model
{
    use HasCuid2, HasFactory, HasStoreScope, SoftDeletes;

    protected $fillable = [
        'store_id',
        'voucher_number',
        'requester_id',
        'amount_cents',
        'purpose',
        'category',
        'status',
        'receipt_image_url',
        'item_photo_url',
        'approved_by_id',
        'approved_at',
        'disbursed_by_id',
        'disbursed_at',
        'settled_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'approved_at' => 'datetime',
            'disbursed_at' => 'datetime',
            'settled_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_SUBMITTED = 'SUBMITTED';

    public const STATUS_APPROVED_SS = 'APPROVED_SS';

    public const STATUS_DISBURSED = 'DISBURSED';

    public const STATUS_SETTLED = 'SETTLED';

    public const STATUS_REJECTED = 'REJECTED';

    public const STATUS_REJECTED_REFUND_PENDING = 'REJECTED_REFUND_PENDING';

    public const STATUS_REFUNDED = 'REFUNDED';

    public const CATEGORIES = [
        'OPERASIONAL',
        'STRUK_KASIR',
        'LOGISTIK',
        'KONSUMSI',
        'MAINTENANCE',
        'LAINNYA',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function disbursedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disbursed_by_id');
    }

    public function attachments()
    {
        return $this->hasMany(Attachment::class, 'entity_id')->where('entity_type', 'VOUCHER');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'entity_id')
            ->where('entity_name', 'PettyCashVoucher')
            ->orderBy('id', 'desc');
    }
}
