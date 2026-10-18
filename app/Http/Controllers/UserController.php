<?php

namespace App\Http\Controllers;

use App\Actions\User\CreateUserAction;
use App\Actions\User\DeactivateUserAction;
use App\Actions\User\ResetPinAction;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\AuditLog;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $currentUser = $request->user();
        $query = User::with('store');

        if ($currentUser->role !== 'SYSTEM_ADMIN') {
            $query->where('store_id', $currentUser->store_id);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        $sort = $request->query('sort', 'created_at');
        $direction = strtolower($request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSorts = [
            'name' => 'name',
            'nik' => 'nik',
            'role' => 'role',
            'is_active' => 'is_active',
            'created_at' => 'created_at',
        ];

        if (array_key_exists($sort, $allowedSorts)) {
            $query->orderBy($allowedSorts[$sort], $direction);
        } else {
            $query->latest();
        }

        $users = $query->paginate(15)->withQueryString();
        $stores = $currentUser->role === 'SYSTEM_ADMIN' ? Store::where('is_active', true)->get() : [];

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'stores' => $stores,
            'filters' => [
                'search' => $request->input('search', ''),
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(StoreUserRequest $request, CreateUserAction $createUserAction): RedirectResponse
    {
        $createUserAction->execute($request->validated(), $request->ip());

        return redirect()->route('admin.users.index')->with('success', 'Pengguna berhasil ditambahkan.');
    }

    /**
     * Update the specified user.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        $oldValues = $user->only(['name', 'role', 'phone_number']);
        $validated = $request->validated();

        $user->update($validated);
        $user->syncRoles([$validated['role']]);

        AuditLog::create([
            'store_id' => $user->store_id,
            'entity_name' => 'User',
            'entity_id' => $user->id,
            'action' => 'UPDATE_USER',
            'performed_by_id' => $request->user()->id,
            'old_values' => $oldValues,
            'new_values' => $user->only(['name', 'role', 'phone_number']),
            'ip_address' => $request->ip(),
        ]);

        return redirect()->route('admin.users.index')->with('success', 'Data pengguna berhasil diperbarui.');
    }

    /**
     * Reset a user's PIN.
     */
    public function resetPin(Request $request, User $user, ResetPinAction $resetPinAction): RedirectResponse
    {
        Gate::authorize('resetPin', $user);

        $request->validate([
            'pin' => ['nullable', 'string', 'min:6', 'max:10'],
        ]);

        $newPin = $request->input('pin', '123456') ?: '123456';
        $resetPinAction->execute($user, $newPin, $request->ip());

        return redirect()->route('admin.users.index')->with('success', "PIN pengguna {$user->name} berhasil di-reset.");
    }

    /**
     * Toggle a user's active status.
     */
    public function toggleStatus(Request $request, User $user, DeactivateUserAction $deactivateUserAction): RedirectResponse
    {
        Gate::authorize('toggleStatus', $user);

        $deactivateUserAction->execute($user, null, $request->ip());

        $statusText = $user->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return redirect()->route('admin.users.index')->with('success', "Akun pengguna {$user->name} berhasil {$statusText}.");
    }
}
