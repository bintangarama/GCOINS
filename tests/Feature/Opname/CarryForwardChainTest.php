<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\VerifySessionAction;
use App\Actions\Resolution\ApproveResolutionAction;
use App\Actions\Resolution\CreateResolutionAction;
use App\Models\CashOpnameSession;
use App\Models\OpnameItemDefinition;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    $this->store = Store::create([
        'code' => '10435',
        'name' => 'Gramedia World Karawang',
        'is_active' => true,
    ]);

    StoreOpnameConfig::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'imprest_fund_cents' => 500000000, // Rp 5.000.000
        'reconciliation_mode' => 'THREE_POCKETS',
        'has_voucher_integration' => true,
        'has_bank_reconciliation' => true,
        'is_active' => true,
    ]);

    OpnameItemDefinition::create([
        'store_id' => $this->store->id,
        'opname_type' => 'KAS_KECIL',
        'nominal_cents' => 10000000,
        'group_label' => 'Uang Kertas',
        'label' => 'Rp 100.000',
        'unit' => 'Lembar',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $this->sacUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SAC001',
        'name' => 'SAC Kasir',
        'role' => 'SAC',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->sacUser->syncRoles(['SAC']);

    $this->ssUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SS001',
        'name' => 'SS Saksi',
        'role' => 'SS',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->ssUser->syncRoles(['SS']);

    $this->smUser = User::create([
        'store_id' => $this->store->id,
        'nik' => 'SM001',
        'name' => 'Store Manager',
        'role' => 'SM',
        'pin_hash' => Hash::make('123456'),
        'is_active' => true,
    ]);
    $this->smUser->syncRoles(['SM']);
});

test('Outstanding Variance + Resolution Ledger eliminates oscillation across 4 real consecutive cycles', function () {
    $openAction = app(OpenSessionAction::class);
    $submitAction = app(SubmitSessionAction::class);
    $verifyAction = app(VerifySessionAction::class);
    $signOffAction = app(SignOffSessionAction::class);
    $createResolutionAction = app(CreateResolutionAction::class);
    $approveResolutionAction = app(ApproveResolutionAction::class);

    // =========================================================================
    // SIKLUS 1: Tekor Rp100.000 -> Status Wajib SHORTAGE Rp100.000
    // =========================================================================
    $session1 = $openAction->execute($this->sacUser);
    expect($session1->imprest_fund_cents)->toBe(500000000)
        ->and($session1->previous_variance_cents)->toBe(0);

    // Hitung fisik kas di brankas tekor Rp 100.000: Total actual 4.900.000
    $session1->physical_total_cents = 490000000;
    $session1->total_actual_cents = 490000000;
    $session1->raw_discrepancy_cents = -10000000;
    $session1->cumulative_resolved_cents = 0;
    $session1->outstanding_variance_cents = -10000000;
    $session1->current_variance_cents = -10000000;
    $session1->variance_status = CashOpnameSession::VARIANCE_SHORTAGE;
    $session1->save();

    $submitted1 = $submitAction->execute($session1, $this->sacUser);
    $verified1 = $verifyAction->execute($submitted1, $this->ssUser);
    $approved1 = $signOffAction->execute($verified1, ['confirm_understanding' => true], $this->smUser);

    expect($approved1->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved1->raw_discrepancy_cents)->toBe(-10000000)
        ->and($approved1->cumulative_resolved_cents)->toBe(0)
        ->and($approved1->outstanding_variance_cents)->toBe(-10000000)
        ->and($approved1->variance_status)->toBe(CashOpnameSession::VARIANCE_SHORTAGE);

    // =========================================================================
    // SIKLUS 2: Kasir BELUM mengganti uang
    // Wajib TETAP SHORTAGE Rp100.000 (Anti-Osilasi: TIDAK BOLEH menjadi 0 / BALANCED!)
    // =========================================================================
    $session2 = $openAction->execute($this->sacUser);
    expect($session2->id)->not->toBe($session1->id)
        ->and($session2->imprest_fund_cents)->toBe(500000000)
        ->and($session2->previous_variance_cents)->toBe(-10000000);

    // Fisik uang di brankas masih 4.900.000 karena belum diganti oleh kasir
    $session2->physical_total_cents = 490000000;
    $session2->total_actual_cents = 490000000;
    $session2->raw_discrepancy_cents = -10000000;
    $session2->cumulative_resolved_cents = 0;
    $session2->outstanding_variance_cents = -10000000;
    $session2->current_variance_cents = -10000000;
    $session2->variance_status = CashOpnameSession::VARIANCE_SHORTAGE;
    $session2->save();

    $submitted2 = $submitAction->execute($session2, $this->sacUser);
    $verified2 = $verifyAction->execute($submitted2, $this->ssUser);
    $approved2 = $signOffAction->execute($verified2, ['confirm_understanding' => true], $this->smUser);

    // Verifikasi kritis: Selisih TIDAK HILANG! Wajib tetap SHORTAGE Rp 100.000!
    expect($approved2->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved2->raw_discrepancy_cents)->toBe(-10000000)
        ->and($approved2->cumulative_resolved_cents)->toBe(0)
        ->and($approved2->outstanding_variance_cents)->toBe(-10000000)
        ->and($approved2->variance_status)->toBe(CashOpnameSession::VARIANCE_SHORTAGE);

    // =========================================================================
    // SIKLUS 3: Resolusi kasir setor pengganti Rp100.000 disetujui -> Menjadi BALANCED (0)
    // =========================================================================
    $session3 = $openAction->execute($this->sacUser);
    expect($session3->id)->not->toBe($session2->id)
        ->and($session3->imprest_fund_cents)->toBe(500000000)
        ->and($session3->previous_variance_cents)->toBe(-10000000);

    // Kas fisik masih 4.900.000 di brankas
    $session3->physical_total_cents = 490000000;
    $session3->total_actual_cents = 490000000;
    $session3->raw_discrepancy_cents = -10000000;
    $session3->save();

    // Kasir mengajukan resolusi penggantian kas tekor Rp 100.000
    $resolution = $createResolutionAction->execute($session3, [
        'kind' => 'REPLACED',
        'amount_cents' => 10000000, // Rp 100.000
        'reason' => 'Kasir setor pengganti kekurangan kas Rp 100.000',
    ], $this->sacUser);

    expect($resolution->status)->toBe('PENDING');

    // SS menyetujui resolusi kasir
    $approveResolutionAction->execute($resolution, $this->ssUser);

    $session3->refresh();
    expect($session3->raw_discrepancy_cents)->toBe(-10000000)
        ->and($session3->cumulative_resolved_cents)->toBe(10000000)
        ->and($session3->outstanding_variance_cents)->toBe(0)
        ->and($session3->variance_status)->toBe(CashOpnameSession::VARIANCE_BALANCED);

    $submitted3 = $submitAction->execute($session3, $this->sacUser);
    $verified3 = $verifyAction->execute($submitted3, $this->ssUser);
    $approved3 = $signOffAction->execute($verified3, ['confirm_understanding' => true], $this->smUser);

    expect($approved3->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved3->outstanding_variance_cents)->toBe(0)
        ->and($approved3->variance_status)->toBe(CashOpnameSession::VARIANCE_BALANCED);

    // =========================================================================
    // SIKLUS 4: Kas normal (Fisik Rp 5.000.000 utuh) -> BALANCED (0)
    // =========================================================================
    $session4 = $openAction->execute($this->sacUser);
    expect($session4->id)->not->toBe($session3->id)
        ->and($session4->imprest_fund_cents)->toBe(500000000)
        ->and($session4->previous_variance_cents)->toBe(0);

    // Kas fisik utuh Rp 5.000.000
    $session4->physical_total_cents = 500000000;
    $session4->total_actual_cents = 500000000;
    $session4->raw_discrepancy_cents = 0;
    $session4->cumulative_resolved_cents = 0;
    $session4->outstanding_variance_cents = 0;
    $session4->current_variance_cents = 0;
    $session4->variance_status = CashOpnameSession::VARIANCE_BALANCED;
    $session4->save();

    $submitted4 = $submitAction->execute($session4, $this->sacUser);
    $verified4 = $verifyAction->execute($submitted4, $this->ssUser);
    $approved4 = $signOffAction->execute($verified4, ['confirm_understanding' => true], $this->smUser);

    expect($approved4->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved4->raw_discrepancy_cents)->toBe(0)
        ->and($approved4->cumulative_resolved_cents)->toBe(0)
        ->and($approved4->outstanding_variance_cents)->toBe(0)
        ->and($approved4->variance_status)->toBe(CashOpnameSession::VARIANCE_BALANCED);
});
