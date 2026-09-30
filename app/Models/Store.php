<?php

namespace App\Models;

use App\Models\Concerns\HasCuid2;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $code
 * @property string $name
 * @property string|null $address
 * @property bool $is_active
 */
class Store extends Model
{
    use HasCuid2, HasFactory;

    protected $fillable = [
        'code',
        'name',
        'address',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function opnameConfigs(): HasMany
    {
        return $this->hasMany(StoreOpnameConfig::class);
    }

    public function itemDefinitions(): HasMany
    {
        return $this->hasMany(OpnameItemDefinition::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(PettyCashVoucher::class);
    }

    public function opnameSessions(): HasMany
    {
        return $this->hasMany(CashOpnameSession::class);
    }

    public function briFundPostings(): HasMany
    {
        return $this->hasMany(BriFundPosting::class);
    }
}
