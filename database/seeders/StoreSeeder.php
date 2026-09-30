<?php

namespace Database\Seeders;

use App\Models\OpnameItemDefinition;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $store = Store::firstOrCreate(
            ['code' => '10435'],
            [
                'name' => 'Gramedia World Karawang',
                'address' => 'Jl. Galuh Mas Raya, Sukaharja, Kec. Telukjambe Timur, Karawang, Jawa Barat 41361',
                'is_active' => true,
            ]
        );

        // Store Opname Config for KAS_KECIL
        StoreOpnameConfig::firstOrCreate(
            [
                'store_id' => $store->id,
                'opname_type' => 'KAS_KECIL',
            ],
            [
                'imprest_fund_cents' => 500000000, // Rp 5.000.000,00
                'reconciliation_mode' => 'THREE_POCKETS',
                'has_voucher_integration' => true,
                'has_bank_reconciliation' => true,
                'is_active' => true,
                'config_json' => [
                    'safe_limit_cents' => 500000000,
                    'variance_threshold_cents' => 0,
                ],
            ]
        );

        // 11 Standard Denomination Item Definitions for KAS_KECIL
        $denominations = [
            // Uang Kertas (7)
            ['label' => 'Rp 100.000', 'nominal_cents' => 10000000, 'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 1],
            ['label' => 'Rp 50.000',  'nominal_cents' => 5000000,  'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 2],
            ['label' => 'Rp 20.000',  'nominal_cents' => 2000000,  'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 3],
            ['label' => 'Rp 10.000',  'nominal_cents' => 1000000,  'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 4],
            ['label' => 'Rp 5.000',   'nominal_cents' => 500000,   'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 5],
            ['label' => 'Rp 2.000',   'nominal_cents' => 200000,   'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 6],
            ['label' => 'Rp 1.000',   'nominal_cents' => 100000,   'unit' => 'Lembar', 'group_label' => 'Uang Kertas', 'sort_order' => 7],

            // Uang Logam (4)
            ['label' => 'Rp 1.000',   'nominal_cents' => 100000,   'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 8],
            ['label' => 'Rp 500',     'nominal_cents' => 50000,    'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 9],
            ['label' => 'Rp 200',     'nominal_cents' => 20000,    'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 10],
            ['label' => 'Rp 100',     'nominal_cents' => 10000,    'unit' => 'Keping', 'group_label' => 'Uang Logam',  'sort_order' => 11],
        ];

        foreach ($denominations as $denom) {
            OpnameItemDefinition::firstOrCreate(
                [
                    'store_id' => $store->id,
                    'opname_type' => 'KAS_KECIL',
                    'nominal_cents' => $denom['nominal_cents'],
                    'group_label' => $denom['group_label'],
                ],
                [
                    'label' => $denom['label'],
                    'unit' => $denom['unit'],
                    'sort_order' => $denom['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
