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
                'nik' => '004838',
                'name' => 'Eny Susanti',
                'role' => 'SM',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567891',
                'is_active' => true,
            ],
            [
                'nik' => '101003',
                'name' => 'Aulia Nur Endayani',
                'role' => 'SAC',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567892',
                'is_active' => true,
            ],
            [
                'nik' => '101024',
                'name' => 'Andra Nurhaliza',
                'role' => 'SS',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567893',
                'is_active' => true,
            ],
            [
                'nik' => '089573',
                'name' => 'Muhamad Nur Shidiq',
                'role' => 'SOA',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567894',
                'is_active' => true,
            ],
            [
                'nik' => '090610',
                'name' => 'Sevila Deliayana',
                'role' => 'SS',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567895',
                'is_active' => true,
            ],
            [
                'nik' => '089179',
                'name' => 'Deshinta Putri',
                'role' => 'SS',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567896',
                'is_active' => true,
            ],
            [
                'nik' => '101144',
                'name' => 'Aloysius Gonzaga Koptarico',
                'role' => 'SS',
                'store_id' => $store?->id,
                'pin_hash' => $pinHash,
                'phone_number' => '081234567897',
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
