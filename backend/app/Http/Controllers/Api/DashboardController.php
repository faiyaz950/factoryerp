<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Production;
use App\Models\Material;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\Party;
use App\Models\Notification;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = today();
        $monthStart = $today->copy()->startOfMonth();
        $monthEnd = $today->copy()->endOfMonth();

        $todayProd = Production::whereDate('date', $today)
            ->selectRaw('COUNT(*) as entries, COALESCE(SUM(production_qty),0) as total_qty, COALESCE(SUM(total_weight),0) as total_weight')
            ->first();

        $monthProd = Production::whereBetween('date', [$monthStart, $monthEnd])
            ->selectRaw('COUNT(*) as entries, COALESCE(SUM(production_qty),0) as total_qty, COALESCE(SUM(total_weight),0) as total_weight')
            ->first();

        $mSales = Invoice::whereBetween('invoice_date', [$monthStart, $monthEnd])
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(grand_total),0) as total')->first();

        $mPay = Payment::whereBetween('payment_date', [$monthStart, $monthEnd])
            ->selectRaw('COALESCE(SUM(amount),0) as total')->first();

        $mExp = Expense::whereBetween('date', [$monthStart, $monthEnd])
            ->selectRaw('COALESCE(SUM(amount),0) as total')->first();

        $lowStock = Material::lowStock()->active()->count();
        $totalDues = Party::where('current_balance', '>', 0)->sum('current_balance');
        $pendingInv = Invoice::whereIn('status', ['draft', 'sent', 'partial', 'overdue'])->count();

        $prodTrend = Production::where('date', '>=', $today->copy()->subDays(7))
            ->selectRaw('date, shift, COUNT(*) as entries, COALESCE(SUM(production_qty),0) as total_qty')
            ->groupBy('date', 'shift')->orderBy('date')->get();

        $topProducts = Production::whereBetween('date', [$monthStart, $monthEnd])
            ->selectRaw('item, SUM(production_qty) as total_qty, SUM(total_weight) as total_weight')
            ->groupBy('item')->orderByDesc('total_qty')->limit(5)->get();

        $unread = $request->user() ? Notification::where('user_id', $request->user()->id)->unread()->count() : 0;

        return response()->json([
            'today' => ['production' => $todayProd],
            'monthly' => [
                'production' => $monthProd,
                'sales' => $mSales,
                'payments' => $mPay->total ?? 0,
                'expenses' => $mExp->total ?? 0,
                'profit' => ($mSales->total ?? 0) - ($mExp->total ?? 0),
            ],
            'alerts' => [
                'low_stock_count' => $lowStock,
                'total_dues' => $totalDues,
                'pending_invoices' => $pendingInv,
                'unread_notifications' => $unread,
            ],
            'charts' => [
                'production_trend' => $prodTrend,
                'top_products' => $topProducts,
            ],
        ]);
    }
}
