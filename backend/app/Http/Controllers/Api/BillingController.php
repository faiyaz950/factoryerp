<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Party;
use App\Models\ActivityLog;
use App\Models\Notification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['party:id,name,company_name', 'creator:id,name']);

        if ($request->filled('party_id')) {
            $query->where('party_id', $request->party_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->where('invoice_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('invoice_date', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('invoice_date', 'desc')->paginate($request->per_page ?? 25)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'party_id' => 'required|exists:parties,id',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date',
            'is_gst' => 'required|boolean',
            'cgst_rate' => 'nullable|numeric|min:0|max:100',
            'sgst_rate' => 'nullable|numeric|min:0|max:100',
            'igst_rate' => 'nullable|numeric|min:0|max:100',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string',
            'items.*.hsn_code' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'required|string',
            'items.*.rate' => 'required|numeric|min:0',
        ]);

        $invoice = Invoice::create([
            'party_id' => $request->party_id,
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'is_gst' => $request->is_gst,
            'cgst_rate' => $request->cgst_rate ?? 0,
            'sgst_rate' => $request->sgst_rate ?? 0,
            'igst_rate' => $request->igst_rate ?? 0,
            'discount' => $request->discount ?? 0,
            'notes' => $request->notes,
            'created_by' => auth()->id(),
        ]);

        foreach ($request->items as $item) {
            $invoice->items()->create($item);
        }

        $invoice->calculateTotals();

        // Update party balance
        $invoice->party->updateBalance();

        ActivityLog::log('invoice_created', 'Invoice', $invoice->id);

        return response()->json([
            'message' => 'Invoice created.',
            'invoice' => $invoice->load('items', 'party:id,name,company_name'),
        ], 201);
    }

    public function show(Invoice $invoice)
    {
        return response()->json(
            $invoice->load('items', 'party', 'payments', 'creator:id,name')
        );
    }

    public function update(Request $request, Invoice $invoice)
    {
        $request->validate([
            'due_date' => 'nullable|date',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:draft,sent,paid,partial,overdue,cancelled',
        ]);

        $old = $invoice->toArray();
        $invoice->update($request->only(['due_date', 'discount', 'notes', 'status']));

        if ($request->has('discount')) {
            $invoice->calculateTotals();
        }

        ActivityLog::log('invoice_updated', 'Invoice', $invoice->id, $old, $invoice->toArray());

        return response()->json(['message' => 'Invoice updated.', 'invoice' => $invoice->fresh()->load('items', 'party')]);
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->party->updateBalance();
        ActivityLog::log('invoice_deleted', 'Invoice', $invoice->id, $invoice->toArray());
        $invoice->delete();
        $invoice->party->updateBalance();
        return response()->json(['message' => 'Invoice deleted.']);
    }

    // Generate PDF
    public function generatePdf(Invoice $invoice)
    {
        $invoice->load('items', 'party', 'creator:id,name');

        $pdf = Pdf::loadView('invoices.pdf', ['invoice' => $invoice]);
        return $pdf->download("Invoice-{$invoice->invoice_number}.pdf");
    }

    // WhatsApp share
    public function whatsappShare(Invoice $invoice)
    {
        $party = $invoice->party;
        $phone = $party->phone ? preg_replace('/[^0-9]/', '', $party->phone) : '';

        $message = "🧾 *Invoice: {$invoice->invoice_number}*\n\n" .
                   "Dear {$party->name},\n\n" .
                   "Amount: ₹" . number_format($invoice->grand_total, 2) . "\n" .
                   "Due: ₹" . number_format($invoice->balance_due, 2) . "\n" .
                   "Date: {$invoice->invoice_date->format('d/m/Y')}\n\n" .
                   "Thank you for your business! 🙏";

        $url = $phone
            ? "https://wa.me/91{$phone}?text=" . urlencode($message)
            : "https://wa.me/?text=" . urlencode($message);

        return response()->json([
            'whatsapp_url' => $url,
            'message' => $message,
        ]);
    }

    // Next invoice number
    public function nextInvoiceNumber()
    {
        return response()->json([
            'next_number' => Invoice::generateInvoiceNumber(),
        ]);
    }
}
