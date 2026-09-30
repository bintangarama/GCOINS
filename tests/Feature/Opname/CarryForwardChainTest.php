<?php

use App\Actions\Opname\OpenSessionAction;
use App\Actions\Opname\SignOffSessionAction;
use App\Actions\Opname\SubmitSessionAction;
use App\Actions\Opname\VerifySessionAction;
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

test('Rule 3: Multi-cycle carry-forward chain preserves variance across consecutive sessions', function () {
    $openAction = app(OpenSessionAction::class);
    $submitAction = app(SubmitSessionAction::class);
    $verifyAction = app(VerifySessionAction::class);
    $signOffAction = app(SignOffSessionAction::class);

    // --- CYCLE 1: First session, V_prev = 0, ends with SHORTAGE of -Rp 100.000 ---
    $session1 = $openAction->execute($this->sacUser);
    expect($session1->previous_variance_cents)->toBe(0)
        ->and($session1->target_reconciled_cents)->toBe(500000000);

    // Simulate final counts on session 1: total actual 4.900.000 -> shortage -100.000
    $session1->physical_total_cents = 490000000;
    $session1->total_actual_cents = 490000000;
    $session1->current_variance_cents = -10000000; // -Rp 100.000
    $session1->variance_status = CashOpnameSession::VARIANCE_SHORTAGE;
    $session1->save();

    $submitted1 = $submitAction->execute($session1, $this->sacUser);
    $verified1 = $verifyAction->execute($submitted1, $this->ssUser);
    $approved1 = $signOffAction->execute($verified1, ['confirm_understanding' => true], $this->smUser);

    expect($approved1->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved1->current_variance_cents)->toBe(-10000000);

    // --- CYCLE 2: Reads V_prev from Cycle 1 (-Rp 100.000), ends with SURPLUS of +Rp 50.000 ---
    $session2 = $openAction->execute($this->sacUser);
    expect($session2->id)->not->toBe($session1->id)
        ->and($session2->previous_variance_cents)->toBe(-10000000)
        ->and($session2->target_reconciled_cents)->toBe(490000000); // 500.000.000 + (-10.000.000)

    // Simulate final counts on session 2: total actual 4.950.000 -> surplus +50.000 vs target 4.900.000
    $session2->physical_total_cents = 495000000;
    $session2->total_actual_cents = 495000000;
    $session2->current_variance_cents = 5000000; // +Rp 50.000
    $session2->variance_status = CashOpnameSession::VARIANCE_SURPLUS;
    $session2->save();

    $submitted2 = $submitAction->execute($session2, $this->sacUser);
    $verified2 = $verifyAction->execute($submitted2, $this->ssUser);
    $approved2 = $signOffAction->execute($verified2, ['confirm_understanding' => true], $this->smUser);

    expect($approved2->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved2->current_variance_cents)->toBe(5000000);

    // --- CYCLE 3: Reads V_prev from Cycle 2 (+Rp 50.000), ends BALANCED (0) ---
    $session3 = $openAction->execute($this->sacUser);
    expect($session3->id)->not->toBe($session2->id)
        ->and($session3->previous_variance_cents)->toBe(5000000)
        ->and($session3->target_reconciled_cents)->toBe(505000000); // 500.000.000 + 5.000.000

    // Simulate final counts on session 3: total actual 5.050.000 -> balanced
    $session3->physical_total_cents = 505000000;
    $session3->total_actual_cents = 505000000;
    $session3->current_variance_cents = 0;
    $session3->variance_status = CashOpnameSession::VARIANCE_BALANCED;
    $session3->save();

    $submitted3 = $submitAction->execute($session3, $this->sacUser);
    $verified3 = $verifyAction->execute($submitted3, $this->ssUser);
    $approved3 = $signOffAction->execute($verified3, ['confirm_understanding' => true], $this->smUser);

    expect($approved3->status)->toBe(CashOpnameSession::STATUS_APPROVED)
        ->and($approved3->current_variance_cents)->toBe(0);

    // --- CYCLE 4: Reads V_prev from Cycle 3 (0) ---
    $session4 = $openAction->execute($this->sacUser);
    expect($session4->id)->not->toBe($session3->id)
        ->and($session4->previous_variance_cents)->toBe(0)
        ->and($session4->target_reconciled_cents)->toBe(500000000);
});
