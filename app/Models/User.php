<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property string $id
 * @property string|null $store_id
 * @property string $nik
 * @property string $name
 * @property string $role
 * @property string $pin_hash
 * @property string|null $phone_number
 * @property bool $is_active
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasCuid2, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'store_id',
        'nik',
        'name',
        'role',
        'pin_hash',
        'phone_number',
        'is_active',
    ];

    protected $hidden = [
        'pin_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the password for authentication (mapped to pin_hash).
     */
    public function getAuthPassword(): string
    {
        return $this->pin_hash;
    }

    /**
     * Verify whether a given raw PIN matches the user's pin_hash.
     */
    public function verifyPin(string $pin): bool
    {
        return Hash::check($pin, $this->pin_hash);
    }

    /**
     * Store relationship.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
