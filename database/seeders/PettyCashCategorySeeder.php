<?php

namespace Database\Seeders;

use App\Models\PettyCashCategory;
use Illuminate\Database\Seeder;

class PettyCashCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $standardCategories = [
            [
                'code' => 'BDL',
                'name' => 'BDL-Luar kota & Lainnya',
                'description' => 'Biaya dinas luar kota & keperluan dinas lainnya',
                'sort_order' => 10,
            ],
            [
                'code' => 'BBM_MOBIL',
                'name' => 'Pem. Bbm Mobil',
                'description' => 'Pembelian BBM mobil operasional toko',
                'sort_order' => 20,
            ],
            [
                'code' => 'BBM_MOTOR',
                'name' => 'Pem. Bbm Motor',
                'description' => 'Pembelian BBM motor inventaris toko',
                'sort_order' => 30,
            ],
            [
                'code' => 'KERTAS_FORMULIR',
                'name' => 'Kertas & Formulir',
                'description' => 'Kertas struk kasir, kertas HVS & formulir cetak toko',
                'sort_order' => 40,
            ],
            [
                'code' => 'BIAYA_PEMASARAN',
                'name' => 'Biaya Pemasaran',
                'description' => 'Biaya kegiatan pemasaran & event toko',
                'sort_order' => 50,
            ],
            [
                'code' => 'IKLAN',
                'name' => 'Iklan',
                'description' => 'Iklan digital, cetak brosur, banner & materi promosi',
                'sort_order' => 60,
            ],
            [
                'code' => 'ONGKIR',
                'name' => 'Ongkir',
                'description' => 'Ongkos kirim paket & ekspedisi antar toko / vendor',
                'sort_order' => 70,
            ],
            [
                'code' => 'EMBALLAGE',
                'name' => 'Ongkos Emballage',
                'description' => 'Bahan pembungkus, bubble wrap, lakban packing kasir & MP',
                'sort_order' => 80,
            ],
            [
                'code' => 'KEP_RT',
                'name' => 'Kep RT',
                'description' => 'Keperluan rumah tangga toko, konsumsi meeting/tamu/audit & pantry',
                'sort_order' => 90,
            ],
            [
                'code' => 'LAINNYA',
                'name' => 'Lainnya',
                'description' => 'Pengeluaran operasional kas kecil lainnya',
                'sort_order' => 100,
            ],
        ];

        foreach ($standardCategories as $cat) {
            PettyCashCategory::firstOrCreate(
                [
                    'store_id' => null,
                    'code' => $cat['code'],
                ],
                [
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'sort_order' => $cat['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
