<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Party;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class PartyController extends Controller
{
    public function index(Request $request)
    {
        $query = Party::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('company_name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%")
                  ->orWhere('gstin', 'like', "%{$request->search}%");
            });
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->boolean('with_dues')) {
            $query->withDues();
        }

        return response()->json(
            $query->orderBy('name')->paginate($request->per_page ?? 25)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'gstin' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'pincode' => 'nullable|string|max:10',
            'type' => 'required|in:customer,supplier,both',
            'opening_balance' => 'nullable|numeric',
        ]);

        $data = $request->all();
        $data['current_balance'] = $request->opening_balance ?? 0;

        $party = Party::create($data);
        ActivityLog::log('party_created', 'Party', $party->id);

        return response()->json(['message' => 'Party created.', 'party' => $party], 201);
    }

    public function show(Party $party)
    {
        $party->load([
            'invoices' => fn($q) => $q->latest()->limit(20),
            'payments' => fn($q) => $q->latest()->limit(20),
        ]);
        return response()->json($party);
    }

    public function update(Request $request, Party $party)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'gstin' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'pincode' => 'nullable|string|max:10',
            'type' => 'sometimes|in:customer,supplier,both',
            'is_active' => 'sometimes|boolean',
        ]);

        $old = $party->toArray();
        $party->update($request->all());
        ActivityLog::log('party_updated', 'Party', $party->id, $old, $party->toArray());

        return response()->json(['message' => 'Party updated.', 'party' => $party]);
    }

    public function destroy(Party $party)
    {
        ActivityLog::log('party_deleted', 'Party', $party->id, $party->toArray());
        $party->delete();
        return response()->json(['message' => 'Party deleted.']);
    }

    // Ledger for a party
    public function ledger(Request $request, Party $party)
    {
        $invoices = $party->invoices()
            ->select('id', 'invoice_number', 'invoice_date as date', 'grand_total as amount', 'status')
            ->get()
            ->map(fn($i) => [...$i->toArray(), 'type' => 'invoice']);

        $payments = $party->payments()
            ->select('id', 'payment_number', 'payment_date as date', 'amount', 'method')
            ->get()
            ->map(fn($p) => [...$p->toArray(), 'type' => 'payment']);

        $ledger = $invoices->merge($payments)->sortByDesc('date')->values();

        return response()->json([
            'party' => $party->only(['id', 'name', 'company_name', 'opening_balance', 'current_balance']),
            'ledger' => $ledger,
        ]);
    }

    // Parties with dues
    public function dues()
    {
        $parties = Party::withDues()
            ->select('id', 'name', 'company_name', 'phone', 'current_balance')
            ->orderByDesc('current_balance')
            ->get();

        $totalDues = $parties->sum('current_balance');

        return response()->json([
            'total_dues' => $totalDues,
            'parties' => $parties,
        ]);
    }
}
