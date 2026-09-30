<?php

namespace App\Actions\Store;

use App\Models\AuditLog;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class UpdateStoreSettingsAction
{
    /**
     * Update store settings and opname configuration.
     *
     * @throws AuthorizationException
     */
    public function execute(
        Store $store,
        User $user,
        array $data,
        ?string $ipAddress = null
    ): Store {
        if (! in_array($user->role, ['SM', 'SYSTEM_ADMIN'])) {
            throw new AuthorizationException(__('Hanya SM atau SYSTEM_ADMIN yang dapat mengubah pengaturan toko.'));
        }

        if ($user->role === 'SM' && $user->store_id !== $store->id) {
            throw new AuthorizationException(__('Anda hanya dapat mengubah toko tempat Anda bertugas.'));
        }

        return DB::transaction(function () use ($store, $user, $data, $ipAddress) {
            $oldValues = [
                'name' => $store->name,
                'address' => $store->address,
            ];

            $store->update([
                'name' => $data['name'] ?? $store->name,
                'address' => $data['address'] ?? $store->address,
            ]);

            $newValues = [
                'name' => $store->name,
                'address' => $store->address,
            ];

            // Update imprest fund for KAS_KECIL if provided
            if (isset($data['imprest_fund_cents'])) {
                $kasKecilConfig = StoreOpnameConfig::where('store_id', $store->id)
                    ->where('opname_type', 'KAS_KECIL')
                    ->first();

                if ($kasKecilConfig) {
                    $oldValues['imprest_fund_cents'] = $kasKecilConfig->imprest_fund_cents;
                    $kasKecilConfig->update([
                        'imprest_fund_cents' => (int) $data['imprest_fund_cents'],
                    ]);
                    $newValues['imprest_fund_cents'] = $kasKecilConfig->imprest_fund_cents;
                }
            }

            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'Store',
                'entity_id' => $store->id,
                'action' => 'UPDATE_STORE_SETTINGS',
                'performed_by_id' => $user->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => $ipAddress,
            ]);

            return $store;
        });
    }
}
