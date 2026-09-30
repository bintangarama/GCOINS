<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define permissions
        $permissions = [
            // User / Account
            'auth.change_own_pin',
            'auth.reset_pin',
            'users.manage',
            'stores.manage',
            'opname_config.manage',

            // Vouchers
            'vouchers.create',
            'vouchers.delete_draft',
            'vouchers.submit',
            'vouchers.approve',
            'vouchers.reject',
            'vouchers.disburse',
            'vouchers.batch_settle',
            'vouchers.cancel',
            'vouchers.refund',

            // Cash Opname
            'opname.open',
            'opname.input_denominations',
            'opname.input_bri',
            'opname.submit',
            'opname.verify_ss',
            'opname.reject_ss',
            'opname.approve_sm',
            'opname.reject_sm',

            // BRI Fund
            'bri.record_inflow',
            'bri.record_outflow',
            'bri.approve_outflow',
            'bri.reject_outflow',
            'bri.view_history',

            // Reports & Admin
            'reports.export_baco',
            'reports.export_vouchers',
            'reports.print',
            'audit.view',
            'data.import_export',
        ];

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        // Roles
        $soa = Role::findOrCreate('SOA', 'web');
        $soa->syncPermissions([
            'auth.change_own_pin',
            'vouchers.create',
            'vouchers.delete_draft',
            'vouchers.submit',
        ]);

        $ss = Role::findOrCreate('SS', 'web');
        $ss->syncPermissions([
            'auth.change_own_pin',
            'vouchers.create',
            'vouchers.delete_draft',
            'vouchers.submit',
            'vouchers.approve',
            'vouchers.reject',
            'opname.verify_ss',
            'opname.reject_ss',
            'bri.record_inflow',
            'bri.record_outflow',
            'bri.approve_outflow',
            'bri.reject_outflow',
            'bri.view_history',
            'reports.export_baco',
            'reports.export_vouchers',
            'reports.print',
        ]);

        $sac = Role::findOrCreate('SAC', 'web');
        $sac->syncPermissions([
            'auth.change_own_pin',
            'auth.reset_pin',
            'users.manage',
            'vouchers.create',
            'vouchers.delete_draft',
            'vouchers.submit',
            'vouchers.approve',
            'vouchers.reject',
            'vouchers.disburse',
            'vouchers.batch_settle',
            'vouchers.cancel',
            'vouchers.refund',
            'opname.open',
            'opname.input_denominations',
            'opname.input_bri',
            'opname.submit',
            'bri.record_inflow',
            'bri.record_outflow',
            'bri.view_history',
            'reports.export_baco',
            'reports.export_vouchers',
            'reports.print',
            'audit.view',
            'data.import_export',
        ]);

        $sm = Role::findOrCreate('SM', 'web');
        $sm->syncPermissions([
            'auth.change_own_pin',
            'auth.reset_pin',
            'users.manage',
            'vouchers.approve',
            'vouchers.reject',
            'vouchers.cancel',
            'opname.approve_sm',
            'opname.reject_sm',
            'bri.approve_outflow',
            'bri.reject_outflow',
            'bri.view_history',
            'reports.export_baco',
            'reports.export_vouchers',
            'reports.print',
            'audit.view',
            'data.import_export',
        ]);

        $admin = Role::findOrCreate('SYSTEM_ADMIN', 'web');
        $admin->syncPermissions([
            'auth.change_own_pin',
            'auth.reset_pin',
            'users.manage',
            'stores.manage',
            'opname_config.manage',
            'audit.view',
            'data.import_export',
        ]);
    }
}
