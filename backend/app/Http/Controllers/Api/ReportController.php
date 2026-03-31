<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Production;
use App\Models\Material;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Party;
use App\Models\Payment;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function production(Request $request)
    {
        $request->validate(['date_from' => 'required|date', 'date_to' => 'required|date']);

        $data = Production::whereBetween('date', [$request->date_from, $request->date_to])
            ->selectRaw('date, shift, item, operator, SUM(production_qty) as qty, SUM(total_weight) as weight, SUM(wastage_weight) as wastage')
            ->groupBy('date', 'shift', 'item', 'operator')
            ->orderBy('date')->get();

        $totals = Production::whereBetween('date', [$request->date_from, $request->date_to])
            ->selectRaw('SUM(production_qty) as qty, SUM(total_weight) as weight, SUM(wastage_weight) as wastage')
            ->first();

        return response()->json(['data' => $data, 'totals' => $totals]);
    }

    public function stock()
    {
        $materials = Material::active()
            ->select('id', 'name', 'code', 'category', 'unit', 'current_stock', 'minimum_stock', 'price_per_unit')
            ->orderBy('name')->get()
            ->map(fn($m) => [...$m->toArray(), 'is_low' => $m->isLowStock(), 'value' => $m->current_stock * $m->price_per_unit]);

        $totalValue = $materials->sum('value');

        return response()->json(['materials' => $materials, 'total_value' => $totalValue]);
    }

    public function wastage(Request $request)
    {
        $request->validate(['date_from' => 'required|date', 'date_to' => 'required|date']);

        $data = Production::whereBetween('date', [$request->date_from, $request->date_to])
            ->where('wastage_weight', '>', 0)
            ->selectRaw('item, SUM(wastage_weight) as wastage, SUM(total_weight) as production')
            ->groupBy('item')->orderByDesc('wastage')->get()
            ->map(fn($r) => [...$r->toArray(), 'percentage' => $r->production > 0 ? round(($r->wastage / $r->production) * 100, 2) : 0]);

        return response()->json($data);
    }

    public function profitLoss(Request $request)
    {
        $request->validate(['date_from' => 'required|date', 'date_to' => 'required|date']);

        $sales = Invoice::whereBetween('invoice_date', [$request->date_from, $request->date_to])->sum('grand_total');
        $payments = Payment::whereBetween('payment_date', [$request->date_from, $request->date_to])->sum('amount');
        $expenses = Expense::whereBetween('date', [$request->date_from, $request->date_to])->sum('amount');

        return response()->json([
            'sales' => $sales, 'payments_received' => $payments,
            'expenses' => $expenses, 'profit' => $sales - $expenses,
            'collection_rate' => $sales > 0 ? round(($payments / $sales) * 100, 2) : 0,
        ]);
    }

    public function partyDues()
    {
        $parties = Party::where('current_balance', '>', 0)
            ->select('id', 'name', 'company_name', 'phone', 'current_balance')
            ->orderByDesc('current_balance')->get();

        return response()->json(['total' => $parties->sum('current_balance'), 'parties' => $parties]);
    }

    public function globalSearch(Request $request)
    {
        $q = $request->input('q', '');
        if (strlen($q) < 2) return response()->json([]);

        $results = [];
        $results['parties'] = Party::where('name', 'like', "%{$q}%")->orWhere('company_name', 'like', "%{$q}%")->limit(5)->get(['id', 'name', 'company_name']);
        $results['invoices'] = Invoice::where('invoice_number', 'like', "%{$q}%")->limit(5)->get(['id', 'invoice_number', 'grand_total', 'status']);
        $results['productions'] = Production::where('item', 'like', "%{$q}%")->orWhere('operator', 'like', "%{$q}%")->limit(5)->get(['id', 'item', 'operator', 'date']);
        $results['materials'] = Material::where('name', 'like', "%{$q}%")->orWhere('code', 'like', "%{$q}%")->limit(5)->get(['id', 'name', 'code']);

        return response()->json($results);
    }
}
