<?php

namespace App\Http\Controllers;

use App\Actions\Category\CreateCategoryAction;
use App\Actions\Category\UpdateCategoryAction;
use App\Models\PettyCashCategory;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PettyCashCategoryController extends Controller
{
    /**
     * Display a listing of petty cash categories.
     */
    public function index(Request $request): Response
    {
        $currentUser = $request->user();

        if (! in_array($currentUser->role, ['SAC', 'SM', 'SYSTEM_ADMIN'], true)) {
            abort(403, __('Anda tidak memiliki hak akses ke halaman kategori kas kecil.'));
        }

        $query = PettyCashCategory::with('store:id,name,code')->orderBy('sort_order')->orderBy('name');

        if ($currentUser->role !== 'SYSTEM_ADMIN') {
            $query->forStore($currentUser->store_id);
        } else {
            if ($request->filled('store_id')) {
                if ($request->input('store_id') === 'global') {
                    $query->global();
                } else {
                    $query->where('store_id', $request->input('store_id'));
                }
            }
        }

        $categories = $query->get();

        $stores = $currentUser->role === 'SYSTEM_ADMIN'
            ? Store::orderBy('name')->get(['id', 'name', 'code'])
            : [];

        return Inertia::render('Admin/Categories/Index', [
            'categories' => $categories,
            'stores' => $stores,
            'filters' => $request->only(['store_id']),
            'canManageGlobal' => $currentUser->role === 'SYSTEM_ADMIN',
            'canManageStore' => in_array($currentUser->role, ['SYSTEM_ADMIN', 'SM', 'SAC']),
            'currentStoreId' => $currentUser->store_id,
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(Request $request, CreateCategoryAction $action): RedirectResponse
    {
        $currentUser = $request->user();
        $storeIdInput = $request->input('store_id');
        if ($storeIdInput === 'global' || $storeIdInput === '') {
            $request->merge(['store_id' => null]);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'store_id' => ['nullable', 'string', 'exists:stores,id'],
        ], [
            'code.required' => 'Kode kategori wajib diisi.',
            'name.required' => 'Nama kategori wajib diisi.',
        ]);

        // Non-admin can only create category for their own store
        if ($currentUser->role !== 'SYSTEM_ADMIN') {
            $validated['store_id'] = $currentUser->store_id;
        }

        $action->execute($validated, $currentUser, $request->ip());

        return back()->with('success', 'Kategori pengeluaran kas kecil berhasil ditambahkan.');
    }

    /**
     * Update the specified category.
     */
    public function update(Request $request, PettyCashCategory $category, UpdateCategoryAction $action): RedirectResponse
    {
        $currentUser = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Nama kategori wajib diisi.',
        ]);

        $action->execute($category, $validated, $currentUser, $request->ip());

        return back()->with('success', 'Kategori pengeluaran kas kecil berhasil diperbarui.');
    }

    /**
     * Toggle active status of the specified category.
     */
    public function toggleStatus(Request $request, PettyCashCategory $category, UpdateCategoryAction $action): RedirectResponse
    {
        $currentUser = $request->user();

        $action->execute($category, [
            'is_active' => ! $category->is_active,
        ], $currentUser, $request->ip());

        $statusText = $category->fresh()->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Kategori {$category->name} berhasil {$statusText}.");
    }
}
