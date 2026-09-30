<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\BriFundController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OpnameController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StoreSettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VoucherController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Auth::check() ? redirect()->route('dashboard') : redirect()->route('login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthController::class, 'create'])->name('login');
    Route::post('login', [AuthController::class, 'store'])->middleware('throttle:login');
});

Route::middleware(['auth', 'store.scope'])->group(function () {
    Route::post('logout', [AuthController::class, 'destroy'])->name('logout');

    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Notifications Module
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::post('{notification}/read', [NotificationController::class, 'markAsRead'])->name('read');
        Route::post('read-all', [NotificationController::class, 'markAllAsRead'])->name('read-all');
        Route::delete('{notification}', [NotificationController::class, 'destroy'])->name('destroy');
    });

    // Profile & Change PIN
    Route::prefix('profile')->name('profile.')->group(function () {
        Route::get('/', [ProfileController::class, 'show'])->name('show');
        Route::put('pin', [ProfileController::class, 'updatePin'])->name('update-pin');
    });

    // Vouchers Module
    Route::prefix('vouchers')->name('vouchers.')->group(function () {
        Route::get('/', [VoucherController::class, 'index'])->name('index');
        Route::get('create', [VoucherController::class, 'create'])->name('create');
        Route::post('/', [VoucherController::class, 'store'])->name('store');
        Route::get('pending', [VoucherController::class, 'pending'])->name('pending');
        Route::get('settlement', [VoucherController::class, 'settlement'])->name('settlement');
        Route::post('batch-settle', [VoucherController::class, 'batchSettle'])->name('batch-settle');
        Route::get('export', [VoucherController::class, 'export'])->name('export');
        Route::get('{voucher}', [VoucherController::class, 'show'])->name('show');
        Route::delete('{voucher}', [VoucherController::class, 'destroy'])->name('destroy');
        Route::post('{voucher}/submit', [VoucherController::class, 'submit'])->name('submit');
        Route::post('{voucher}/approve', [VoucherController::class, 'approve'])->name('approve');
        Route::post('{voucher}/reject', [VoucherController::class, 'reject'])->name('reject');
        Route::post('{voucher}/disburse', [VoucherController::class, 'disburse'])->name('disburse');
        Route::post('{voucher}/cancel', [VoucherController::class, 'cancel'])->name('cancel');
        Route::post('{voucher}/refund', [VoucherController::class, 'refund'])->name('refund');
    });

    // BRI Fund Postings (Bank Sub-Ledger)
    Route::prefix('bri-funds')->name('bri-funds.')->group(function () {
        Route::get('/', [BriFundController::class, 'overview'])->name('overview');
        Route::get('postings', [BriFundController::class, 'postings'])->name('postings');
        Route::get('create', [BriFundController::class, 'create'])->name('create');
        Route::post('/', [BriFundController::class, 'store'])->name('store');
        Route::get('export', [BriFundController::class, 'export'])->name('export');
        Route::get('pending', [BriFundController::class, 'pending'])->name('pending');
        Route::post('{posting}/approve', [BriFundController::class, 'approve'])->name('approve');
        Route::post('{posting}/reject', [BriFundController::class, 'reject'])->name('reject');
        Route::get('entity/{entityName}', [BriFundController::class, 'entityDetail'])->name('entity-detail');
        Route::get('balances', [BriFundController::class, 'balances'])->name('balances');
    });

    // Cash Opname Module
    Route::prefix('opname')->name('opname.')->group(function () {
        Route::get('/', [OpnameController::class, 'index'])->name('index');
        Route::get('active', [OpnameController::class, 'active'])->name('active');
        Route::post('start', [OpnameController::class, 'start'])->name('start');
        Route::get('{session}', [OpnameController::class, 'show'])->name('show');
        Route::get('{session}/report', [OpnameController::class, 'report'])->name('report');
        Route::get('{session}/export-excel', [OpnameController::class, 'exportExcel'])->name('export-excel');
        Route::post('{session}/signed-ba', [OpnameController::class, 'uploadSignedBa'])->name('signed-ba.upload');
        Route::put('{session}/denominations', [OpnameController::class, 'updateDenominations'])->name('denominations.update');
        Route::put('{session}/bri-subledger', [OpnameController::class, 'updateBriSubledger'])->name('bri-subledger.update');
        Route::post('{session}/bri-sync', [OpnameController::class, 'syncBri'])->name('bri.sync');
        Route::post('{session}/submit', [OpnameController::class, 'submit'])->name('submit');
        Route::post('{session}/verify', [OpnameController::class, 'verify'])->name('verify');
        Route::post('{session}/reject-ss', [OpnameController::class, 'rejectSs'])->name('reject-ss');
        Route::post('{session}/sign-off', [OpnameController::class, 'signOff'])->name('sign-off');
        Route::post('{session}/reject-sm', [OpnameController::class, 'rejectSm'])->name('reject-sm');
    });

    // Admin & Settings
    Route::prefix('admin')->name('admin.')->group(function () {
        // Users
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::post('users/{user}/reset-pin', [UserController::class, 'resetPin'])->name('users.reset-pin');
        Route::post('users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle-status');

        // Store Settings
        Route::get('store-settings', [StoreSettingsController::class, 'show'])->name('store-settings.show');
        Route::put('store-settings', [StoreSettingsController::class, 'update'])->name('store-settings.update');

        // Audit Logs
        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('audit-logs/export', [AuditLogController::class, 'export'])->name('audit-logs.export');

        // Import & Export Center
        Route::prefix('import-export')->name('import-export.')->group(function () {
            Route::get('/', [ImportExportController::class, 'index'])->name('index');
            Route::get('export/users', [ImportExportController::class, 'exportUsers'])->name('export.users');
            Route::get('export/vouchers', [ImportExportController::class, 'exportVouchers'])->name('export.vouchers');
            Route::get('export/bri-postings', [ImportExportController::class, 'exportBriPostings'])->name('export.bri-postings');
            Route::get('export/audit-logs', [ImportExportController::class, 'exportAuditLogs'])->name('export.audit-logs');
            Route::get('template/{type}', [ImportExportController::class, 'downloadTemplate'])->name('template');
            Route::post('preview', [ImportExportController::class, 'preview'])->name('preview');
            Route::post('commit', [ImportExportController::class, 'commit'])->name('commit');
        });
    });
});
