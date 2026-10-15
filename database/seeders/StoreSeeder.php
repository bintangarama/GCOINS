<?php

namespace Database\Seeders;

use App\Models\CashOpnameSession;
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
        $defaultStore = Store::firstOrCreate(
            ['code' => '10435'],
            [
                'name' => 'Gramedia World Karawang',
                'address' => 'Jl. Galuh Mas Raya, Sukaharja, Kec. Telukjambe Timur, Karawang, Jawa Barat 41361',
                'is_active' => true,
            ]
        );

        $stores = Store::all();
        if ($stores->isEmpty()) {
            $stores = collect([$defaultStore]);
        }

        // Standard 11 Cash Denominations (Used by KAS_KECIL, KAS_BESAR, and ACTIVE_SELLING)
        $standardCashDenominations = [
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

        // Standard Materai Items
        $materaiItems = [
            ['label' => 'Materai Rp 10.000', 'nominal_cents' => 1000000, 'unit' => 'Keping', 'group_label' => 'Bea Materai', 'sort_order' => 1],
            ['label' => 'Materai Rp 6.000',  'nominal_cents' => 600000,  'unit' => 'Keping', 'group_label' => 'Bea Materai', 'sort_order' => 2],
            ['label' => 'Materai Rp 3.000',  'nominal_cents' => 300000,  'unit' => 'Keping', 'group_label' => 'Bea Materai', 'sort_order' => 3],
        ];

        // Standard Gift Voucher Items
        $giftVoucherItems = [
            ['label' => 'Voucher Gramedia Rp 100.000', 'nominal_cents' => 10000000, 'unit' => 'Lembar', 'group_label' => 'Gift Voucher', 'sort_order' => 1],
            ['label' => 'Voucher Gramedia Rp 50.000',  'nominal_cents' => 5000000,  'unit' => 'Lembar', 'group_label' => 'Gift Voucher', 'sort_order' => 2],
            ['label' => 'Voucher Gramedia Rp 25.000',  'nominal_cents' => 2500000,  'unit' => 'Lembar', 'group_label' => 'Gift Voucher', 'sort_order' => 3],
            ['label' => 'Voucher Gramedia Rp 10.000',  'nominal_cents' => 1000000,  'unit' => 'Lembar', 'group_label' => 'Gift Voucher', 'sort_order' => 4],
        ];

        // Config mappings for each of the 5 opname types
        $configs = [
            CashOpnameSession::TYPE_KAS_KECIL => [
                'imprest_fund_cents' => 500000000, // Rp 5.000.000,00
                'reconciliation_mode' => 'THREE_POCKETS',
                'has_voucher_integration' => true,
                'has_bank_reconciliation' => true,
                'is_active' => true,
                'config_json' => [
                    'safe_limit_cents' => 500000000,
                    'variance_threshold_cents' => 0,
                ],
                'items' => $standardCashDenominations,
            ],
            CashOpnameSession::TYPE_KAS_BESAR => [
                'imprest_fund_cents' => 0,
                'reconciliation_mode' => 'CASH_FLOW',
                'has_voucher_integration' => false,
                'has_bank_reconciliation' => false,
                'is_active' => true,
                'config_json' => [
                    'requires_z_report' => true,
                    'variance_threshold_cents' => 0,
                ],
                'items' => $standardCashDenominations,
            ],
            CashOpnameSession::TYPE_ACTIVE_SELLING => [
                'imprest_fund_cents' => 0,
                'reconciliation_mode' => 'CONSIGNMENT',
                'has_voucher_integration' => false,
                'has_bank_reconciliation' => false,
                'is_active' => true,
                'config_json' => [
                    'variance_threshold_cents' => 0,
                ],
                'items' => $standardCashDenominations,
            ],
            CashOpnameSession::TYPE_MATERAI => [
                'imprest_fund_cents' => 0,
                'reconciliation_mode' => 'STOCK_COUNT',
                'has_voucher_integration' => false,
                'has_bank_reconciliation' => false,
                'is_active' => true,
                'config_json' => [
                    'track_condition' => true,
                    'variance_threshold_cents' => 0,
                ],
                'items' => $materaiItems,
            ],
            CashOpnameSession::TYPE_GIFT_VOUCHER => [
                'imprest_fund_cents' => 0,
                'reconciliation_mode' => 'SERIAL_STOCK',
                'has_voucher_integration' => false,
                'has_bank_reconciliation' => false,
                'is_active' => true,
                'config_json' => [
                    'track_serials' => true,
                    'variance_threshold_cents' => 0,
                ],
                'items' => $giftVoucherItems,
            ],
        ];

        foreach ($stores as $store) {
            foreach ($configs as $opnameType => $typeConfig) {
                // 1. Create or update StoreOpnameConfig
                StoreOpnameConfig::withoutGlobalScopes()->firstOrCreate(
                    [
                        'store_id' => $store->id,
                        'opname_type' => $opnameType,
                    ],
                    [
                        'imprest_fund_cents' => $typeConfig['imprest_fund_cents'],
                        'reconciliation_mode' => $typeConfig['reconciliation_mode'],
                        'has_voucher_integration' => $typeConfig['has_voucher_integration'],
                        'has_bank_reconciliation' => $typeConfig['has_bank_reconciliation'],
                        'is_active' => $typeConfig['is_active'],
                        'config_json' => $typeConfig['config_json'],
                    ]
                );

                // 2. Create OpnameItemDefinitions for each item
                foreach ($typeConfig['items'] as $item) {
                    OpnameItemDefinition::withoutGlobalScopes()->firstOrCreate(
                        [
                            'store_id' => $store->id,
                            'opname_type' => $opnameType,
                            'nominal_cents' => $item['nominal_cents'],
                            'group_label' => $item['group_label'],
                        ],
                        [
                            'label' => $item['label'],
                            'unit' => $item['unit'],
                            'sort_order' => $item['sort_order'],
                            'is_active' => true,
                        ]
                    );
                }
            }
        }
    }
}
