<?php

namespace App\Actions\Category;

use App\Models\AuditLog;
use App\Models\PettyCashCategory;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateCategoryAction
{
    /**
     * @param  array{code: string, name: string, description?: ?string, sort_order?: int, is_active?: bool, store_id?: ?string}  $data
     */
    public function execute(array $data, User $actor, ?string $ipAddress = null): PettyCashCategory
    {
        $storeId = $data['store_id'] ?? null;

        if ($storeId === null) {
            if ($actor->role !== 'SYSTEM_ADMIN') {
                throw new AuthorizationException(__('Hanya SYSTEM_ADMIN yang dapat membuat kategori pengeluaran global.'));
            }
        } else {
            if (! in_array($actor->role, ['SYSTEM_ADMIN', 'SM', 'SAC'])) {
                throw new AuthorizationException(__('Anda tidak berwenang menambahkan kategori toko.'));
            }

            if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $storeId) {
                throw new AuthorizationException(__('Anda hanya dapat menambahkan kategori untuk toko tempat Anda bertugas.'));
            }
        }

        $code = strtoupper(trim(Str::slug($data['code'], '_')));

        // Check uniqueness for this store_id scope
        $exists = PettyCashCategory::query()
            ->when($storeId === null, fn ($q) => $q->whereNull('store_id'))
            ->when($storeId !== null, fn ($q) => $q->where('store_id', $storeId))
            ->where('code', $code)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'code' => ["Kode kategori '{$code}' sudah digunakan."],
            ]);
        }

        $category = PettyCashCategory::create([
            'store_id' => $storeId,
            'code' => $code,
            'name' => trim($data['name']),
            'description' => $data['description'] ?? null,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        AuditLog::create([
            'store_id' => $storeId,
            'entity_name' => 'PettyCashCategory',
            'entity_id' => $category->id,
            'action' => 'CREATE_CATEGORY',
            'performed_by_id' => $actor->id,
            'old_values' => null,
            'new_values' => $category->toArray(),
            'ip_address' => $ipAddress,
        ]);

        return $category;
    }
}
