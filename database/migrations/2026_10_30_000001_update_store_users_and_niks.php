<?php

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Safely updates existing placeholder NIKs in place (preserving primary keys and relational integrity)
     * and inserts new store personnel.
     */
    public function up(): void
    {
        $store = Store::where('code', '10435')->first();
        if (! $store) {
            return;
        }

        $storeId = $store->id;
        $defaultPinHash = Hash::make('123456');

        // 1. In-place mapping from old demo NIKs to real official NIKs
        $nikMappings = [
            'SM001' => [
                'nik' => '004838',
                'name' => 'Eny Susanti',
                'role' => 'SM',
            ],
            'SAC001' => [
                'nik' => '101003',
                'name' => 'Aulia Nur Endayani',
                'role' => 'SAC',
            ],
            'SS001' => [
                'nik' => '101024',
                'name' => 'Andra Nurhaliza',
                'role' => 'SS',
            ],
            'SOA001' => [
                'nik' => '089573',
                'name' => 'Muhamad Nur Shidiq',
                'role' => 'SOA',
            ],
        ];

        foreach ($nikMappings as $oldNik => $target) {
            $existingUser = User::where('nik', $oldNik)->first();
            if ($existingUser) {
                // Ensure target NIK doesn't collide
                $collision = User::where('nik', $target['nik'])->where('id', '!=', $existingUser->id)->first();
                if (! $collision) {
                    $existingUser->update([
                        'nik' => $target['nik'],
                        'name' => $target['name'],
                        'role' => $target['role'],
                        'store_id' => $storeId,
                    ]);

                    if (Schema::hasTable('roles') && Role::where('name', $target['role'])->exists()) {
                        $existingUser->syncRoles([$target['role']]);
                    }
                }
            }
        }

        // 2. Ensure all 7 official Karawang users exist
        $officialUsers = [
            [
                'nik' => '004838',
                'name' => 'Eny Susanti',
                'role' => 'SM',
                'phone_number' => '081234567891',
            ],
            [
                'nik' => '101003',
                'name' => 'Aulia Nur Endayani',
                'role' => 'SAC',
                'phone_number' => '081234567892',
            ],
            [
                'nik' => '101024',
                'name' => 'Andra Nurhaliza',
                'role' => 'SS',
                'phone_number' => '081234567893',
            ],
            [
                'nik' => '089573',
                'name' => 'Muhamad Nur Shidiq',
                'role' => 'SOA',
                'phone_number' => '081234567894',
            ],
            [
                'nik' => '090610',
                'name' => 'Sevila Deliayana',
                'role' => 'SS',
                'phone_number' => '081234567895',
            ],
            [
                'nik' => '089179',
                'name' => 'Deshinta Putri',
                'role' => 'SS',
                'phone_number' => '081234567896',
            ],
            [
                'nik' => '101144',
                'name' => 'Aloysius Gonzaga Koptarico',
                'role' => 'SS',
                'phone_number' => '081234567897',
            ],
        ];

        foreach ($officialUsers as $userData) {
            $user = User::firstOrCreate(
                ['nik' => $userData['nik']],
                [
                    'name' => $userData['name'],
                    'role' => $userData['role'],
                    'store_id' => $storeId,
                    'pin_hash' => $defaultPinHash,
                    'phone_number' => $userData['phone_number'],
                    'is_active' => true,
                ]
            );

            if (Schema::hasTable('roles') && Role::where('name', $userData['role'])->exists()) {
                $user->syncRoles([$userData['role']]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-destructive rollback to avoid corrupting foreign key relations
    }
};
