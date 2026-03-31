<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\PartyController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\NotificationController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/verify-2fa', [AuthController::class, 'verify2FA']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Global search
    Route::get('/search', [ReportController::class, 'globalSearch']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Production (Admin + Supervisor)
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::apiResource('productions', ProductionController::class);
        Route::get('/production/daily-summary', [ProductionController::class, 'dailySummary']);
        Route::get('/production/shift-comparison', [ProductionController::class, 'shiftComparison']);
    });

    // Materials (Admin + Supervisor)
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::apiResource('materials', MaterialController::class);
        Route::post('/materials/{material}/add-stock', [MaterialController::class, 'addStock']);
        Route::post('/materials/{material}/wastage', [MaterialController::class, 'recordWastage']);
        Route::get('/materials-low-stock', [MaterialController::class, 'lowStockAlerts']);
        Route::get('/materials/{material}/transactions', [MaterialController::class, 'transactions']);
        Route::get('/material-categories', [MaterialController::class, 'categories']);
    });

    // Expenses (Admin + Supervisor)
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::apiResource('expenses', ExpenseController::class);
        Route::get('/expense-categories', [ExpenseController::class, 'categories']);
        Route::post('/expense-categories', [ExpenseController::class, 'storeCategory']);
        Route::delete('/expense-categories/{category}', [ExpenseController::class, 'deleteCategory']);
        Route::get('/expense-daily-summary', [ExpenseController::class, 'dailySummary']);
    });

    // Admin only routes
    Route::middleware('role:admin')->group(function () {
        // Parties
        Route::apiResource('parties', PartyController::class);
        Route::get('/parties/{party}/ledger', [PartyController::class, 'ledger']);
        Route::get('/party-dues', [PartyController::class, 'dues']);

        // Billing
        Route::apiResource('invoices', BillingController::class);
        Route::get('/invoices/{invoice}/pdf', [BillingController::class, 'generatePdf']);
        Route::get('/invoices/{invoice}/whatsapp', [BillingController::class, 'whatsappShare']);
        Route::get('/next-invoice-number', [BillingController::class, 'nextInvoiceNumber']);

        // Payments
        Route::apiResource('payments', PaymentController::class)->except(['update']);

        // Reports
        Route::get('/reports/production', [ReportController::class, 'production']);
        Route::get('/reports/stock', [ReportController::class, 'stock']);
        Route::get('/reports/wastage', [ReportController::class, 'wastage']);
        Route::get('/reports/profit-loss', [ReportController::class, 'profitLoss']);
        Route::get('/reports/party-dues', [ReportController::class, 'partyDues']);

        // User management
        Route::get('/users', [AuthController::class, 'users']);
        Route::post('/users', [AuthController::class, 'createUser']);
        Route::put('/users/{user}', [AuthController::class, 'updateUser']);
        Route::post('/users/{user}/force-logout', [AuthController::class, 'forceLogout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);

        // Logs
        Route::get('/activity-logs', [NotificationController::class, 'activityLogs']);
        Route::get('/login-logs', [NotificationController::class, 'loginLogs']);
    });
});
