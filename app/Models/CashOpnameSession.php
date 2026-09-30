<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use App\Models\Concerns\HasStoreScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CashOpnameSession extends Model
{
    use HasCuid2, HasFactory, HasStoreScope;

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_SUBMITTED = 'SUBMITTED';

    public const STATUS_VERIFIED_SS = 'VERIFIED_SS';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_REJECTED = 'REJECTED';

    public const VARIANCE_BALANCED = 'BALANCED';

    public const VARIANCE_SURPLUS = 'SURPLUS';

    public const VARIANCE_SHORTAGE = 'SHORTAGE';

    public const TYPE_KAS_KECIL = 'KAS_KECIL';

    public const TYPE_KAS_BESAR = 'KAS_BESAR';

    public const TYPE_ACTIVE_SELLING = 'ACTIVE_SELLING';

    public const TYPE_MATERAI = 'MATERAI';

    public const TYPE_VOUCHER = 'VOUCHER';

    public const TYPES = [
        self::TYPE_KAS_KECIL,
        self::TYPE_KAS_BESAR,
        self::TYPE_ACTIVE_SELLING,
        self::TYPE_MATERAI,
        self::TYPE_VOUCHER,
    ];

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isLocked(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    protected $fillable = [
        'store_id',
        'opname_number',
        'opname_type',
        'status',
        'date',
        'imprest_fund_cents',
        'previous_variance_cents',
        'physical_total_cents',
        'vouchers_total_cents',
        'bri_clean_balance_cents',
        'total_actual_cents',
        'target_reconciled_cents',
        'current_variance_cents',
        'variance_status',
        'created_by_id',
        'verified_by_ss_id',
        'approved_by_sm_id',
        'verified_ss_at',
        'approved_sm_at',
        'generated_excel_url',
        'generated_pdf_url',
        'signed_ba_scan_url',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'imprest_fund_cents' => 'integer',
            'previous_variance_cents' => 'integer',
            'physical_total_cents' => 'integer',
            'vouchers_total_cents' => 'integer',
            'bri_clean_balance_cents' => 'integer',
            'total_actual_cents' => 'integer',
            'target_reconciled_cents' => 'integer',
            'current_variance_cents' => 'integer',
            'verified_ss_at' => 'datetime',
            'approved_sm_at' => 'datetime',
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

    public function verifiedBySs(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_ss_id');
    }

    public function approvedBySm(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_sm_id');
    }

    public function itemCounts(): HasMany
    {
        return $this->hasMany(OpnameItemCount::class, 'session_id');
    }

    public function subLedger(): HasOne
    {
        return $this->hasOne(BriSubLedger::class, 'session_id');
    }
}
