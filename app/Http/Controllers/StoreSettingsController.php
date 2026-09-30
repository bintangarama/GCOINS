<?php

namespace App\Http\Controllers;

use App\Actions\Store\UpdateStoreSettingsAction;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StoreSettingsController extends Controller
{
    /**
     * Display the store settings page.
     */
    public function show(Request $request): Response
    {
        $user = $request->user();

        if (! in_array($user->role, ['SM', 'SYSTEM_ADMIN'])) {
            abort(403, __('Hanya SM atau SYSTEM_ADMIN yang dapat mengakses halaman pengaturan toko.'));
        }

        $storeId = $user->store_id ?? $request->query('store_id');
        $store = $storeId ? Store::with(['opnameConfigs', 'itemDefinitions'])->findOrFail($storeId) : Store::with(['opnameConfigs', 'itemDefinitions'])->firstOrFail();

        $allStores = $user->role === 'SYSTEM_ADMIN' ? Store::orderBy('code')->get(['id', 'code', 'name']) : [];

        $kasKecilConfig = $store->opnameConfigs->firstWhere('opname_type', 'KAS_KECIL');

        return Inertia::render('Admin/StoreSettings', [
            'store' => $store,
            'allStores' => $allStores,
            'kasKecilConfig' => $kasKecilConfig,
        ]);
    }

    /**
     * Update store settings.
     */
    public function update(Request $request, UpdateStoreSettingsAction $action): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'store_id' => ['nullable', 'string', 'exists:stores,id'],
            'name' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'imprest_fund_cents' => ['required', 'integer', 'min:0'],
        ], [
            'name.required' => __('Nama toko wajib diisi.'),
            'imprest_fund_cents.required' => __('Plafon kas kecil wajib diisi.'),
            'imprest_fund_cents.min' => __('Plafon kas kecil tidak boleh bernilai negatif.'),
        ]);

        $storeId = $validated['store_id'] ?? $user->store_id;
        $store = Store::findOrFail($storeId);

        $action->execute(
            store: $store,
            user: $user,
            data: $validated,
            ipAddress: $request->ip()
        );

        return back()->with('success', __('Pengaturan toko berhasil diperbarui.'));
    }
}
