<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $store = Store::where('code', '10435')->first();
        $pinHash = Hash::make('123456');

        $users = [
            [
                'nik' => 'ADMIN001',
                'name' => 'System Administrator',
                'role' => 'SYSTEM_ADMIN',
                'store_id' => null,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567890',
                'is_active' => true,
            ],
            [
                'nik' => 'SM001',
                'name' => 'Store Manager Karawang',
                'role' => 'SM',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567891',
                'is_active' => true,
            ],
            [
                'nik' => 'SAC001',
                'name' => 'Staff Admin Clerk Karawang',
                'role' => 'SAC',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567892',
                'is_active' => true,
            ],
            [
                'nik' => 'SS001',
                'name' => 'Store Supervisor Karawang',
                'role' => 'SS',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567893',
                'is_active' => true,
            ],
            [
                'nik' => 'SOA001',
                'name' => 'Store Associate Karawang',
                'role' => 'SOA',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567894',
                'is_active' => true,
            ],
        ];

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['nik' => $userData['nik']],
                $userData
            );

            // Assign Spatie Role
            $user->syncRoles([$userData['role']]);
        }
    }
}
