<?php

namespace App\Actions\Category;

use App\Models\AuditLog;
use App\Models\PettyCashCategory;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateCategoryAction
{
    /**
     * @param  array{name?: string, description?: ?string, sort_order?: int, is_active?: bool}  $data
     */
    public function execute(PettyCashCategory $category, array $data, User $actor, ?string $ipAddress = null): PettyCashCategory
    {
        if ($category->store_id === null) {
            if ($actor->role !== 'SYSTEM_ADMIN') {
                throw new AuthorizationException(__('Hanya SYSTEM_ADMIN yang dapat mengubah kategori pengeluaran global.'));
            }
        } else {
            if (! in_array($actor->role, ['SYSTEM_ADMIN', 'SM', 'SAC'])) {
                throw new AuthorizationException(__('Anda tidak berwenang mengubah kategori toko ini.'));
            }

            if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $category->store_id) {
                throw new AuthorizationException(__('Anda hanya dapat mengubah kategori untuk toko tempat Anda bertugas.'));
            }
        }

        $oldValues = $category->only(['name', 'description', 'sort_order', 'is_active']);

        $updates = [];
        if (isset($data['name'])) {
            $updates['name'] = trim($data['name']);
        }
        if (array_key_exists('description', $data)) {
            $updates['description'] = $data['description'];
        }
        if (isset($data['sort_order'])) {
            $updates['sort_order'] = (int) $data['sort_order'];
        }
        if (isset($data['is_active'])) {
            $updates['is_active'] = (bool) $data['is_active'];
        }

        $category->update($updates);

        AuditLog::create([
            'store_id' => $category->store_id,
            'entity_name' => 'PettyCashCategory',
            'entity_id' => $category->id,
            'action' => 'UPDATE_CATEGORY',
            'performed_by_id' => $actor->id,
            'old_values' => $oldValues,
            'new_values' => $category->only(['name', 'description', 'sort_order', 'is_active']),
            'ip_address' => $ipAddress,
        ]);

        return $category;
    }
}
