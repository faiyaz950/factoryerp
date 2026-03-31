<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with(['party:id,name,company_name', 'invoice:id,invoice_number', 'creator:id,name']);

        if ($request->filled('party_id')) {
            $query->where('party_id', $request->party_id);
        }
        if ($request->filled('method')) {
            $query->where('method', $request->method);
        }
        if ($request->filled('date_from')) {
            $query->where('payment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('payment_date', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('payment_date', 'desc')->paginate($request->per_page ?? 25)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'party_id' => 'required|exists:parties,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,upi,bank_transfer,cheque,other',
            'reference_number' => 'nullable|string|max:255',
            'upi_screenshot' => 'nullable|image|max:5120',
            'payment_date' => 'required|date',
            'remarks' => 'nullable|string',
        ]);

        $data = $request->except('upi_screenshot');
        $data['created_by'] = auth()->id();

        // Handle UPI screenshot upload
        if ($request->hasFile('upi_screenshot')) {
            $path = $request->file('upi_screenshot')->store('upi_screenshots', 'public');
            $data['upi_screenshot'] = $path;
        }

        $payment = Payment::create($data);

        // Notify admins
        Notification::sendToAdmins(
            'payment',
            'Payment Received',
            "₹" . number_format($payment->amount, 2) . " received from {$payment->party->name} via {$payment->method}",
            ['payment_id' => $payment->id]
        );

        ActivityLog::log('payment_created', 'Payment', $payment->id);

        return response()->json([
            'message' => 'Payment recorded.',
            'payment' => $payment->load('party:id,name', 'invoice:id,invoice_number'),
        ], 201);
    }

    public function show(Payment $payment)
    {
        return response()->json(
            $payment->load('party', 'invoice', 'creator:id,name')
        );
    }

    public function destroy(Payment $payment)
    {
        $partyId = $payment->party_id;
        ActivityLog::log('payment_deleted', 'Payment', $payment->id, $payment->toArray());
        $payment->delete();

        // Recalculate party balance
        $party = \App\Models\Party::find($partyId);
        if ($party) $party->updateBalance();

        return response()->json(['message' => 'Payment deleted.']);
    }
}
