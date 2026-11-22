<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('roles') || ! Schema::hasTable('permissions')) {
            return;
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $requesterPermissions = [
            'auth.change_own_pin',
            'vouchers.create',
            'vouchers.delete_draft',
            'vouchers.submit',
        ];

        foreach ($requesterPermissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        foreach (User::REQUESTER_ROLES as $roleName) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($requesterPermissions);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('roles')) {
            return;
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Role::whereIn('name', ['ME', 'CS', 'BM'])->delete();
    }
};

