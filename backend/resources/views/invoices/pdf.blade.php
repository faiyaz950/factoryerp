<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #333; }
        .header { background: #1a1a2e; color: white; padding: 20px; display: flex; justify-content: space-between; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header .subtitle { color: #aaa; font-size: 10px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 28px; color: #e94560; }
        .info-section { display: flex; justify-content: space-between; padding: 20px; }
        .info-box { width: 48%; }
        .info-box h3 { color: #1a1a2e; font-size: 13px; margin-bottom: 8px; border-bottom: 2px solid #e94560; padding-bottom: 3px; }
        .info-box p { margin: 3px 0; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #1a1a2e; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .totals { width: 300px; margin-left: auto; margin-right: 20px; }
        .totals table { margin: 0; }
        .totals td { padding: 5px 10px; }
        .totals .grand-total { background: #1a1a2e; color: white; font-size: 14px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 10px; border-top: 1px solid #eee; margin-top: 30px; }
        .text-right { text-align: right; }
        .gst-tag { background: #27ae60; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; }
    </style>
</head>
<body>
    <table style="width: 100%; border: none; margin: 0;">
        <tr>
            <td style="background: #1a1a2e; color: white; padding: 20px; border: none;">
                <h1 style="font-size: 24px; margin-bottom: 5px;">🏭 FactoryERP</h1>
                <p style="color: #aaa; font-size: 10px;">Plastic Manufacturing Unit</p>
            </td>
            <td style="background: #1a1a2e; color: white; padding: 20px; text-align: right; border: none;">
                <h2 style="font-size: 28px; color: #e94560;">INVOICE</h2>
                <p style="font-size: 12px;">#{{ $invoice->invoice_number }}</p>
                @if($invoice->is_gst)<span class="gst-tag">GST</span>@endif
            </td>
        </tr>
    </table>

    <table style="width: 100%; border: none; margin: 15px 0;">
        <tr>
            <td style="width: 50%; padding: 10px 20px; border: none; vertical-align: top;">
                <h3 style="color: #1a1a2e; font-size: 13px; border-bottom: 2px solid #e94560; padding-bottom: 3px;">Bill To</h3>
                <p style="margin-top: 8px; font-weight: bold;">{{ $invoice->party->name }}</p>
                @if($invoice->party->company_name)<p>{{ $invoice->party->company_name }}</p>@endif
                @if($invoice->party->address)<p>{{ $invoice->party->address }}</p>@endif
                @if($invoice->party->phone)<p>Phone: {{ $invoice->party->phone }}</p>@endif
                @if($invoice->party->gstin)<p>GSTIN: {{ $invoice->party->gstin }}</p>@endif
            </td>
            <td style="width: 50%; padding: 10px 20px; border: none; vertical-align: top; text-align: right;">
                <p><strong>Date:</strong> {{ $invoice->invoice_date->format('d/m/Y') }}</p>
                @if($invoice->due_date)<p><strong>Due:</strong> {{ $invoice->due_date->format('d/m/Y') }}</p>@endif
                <p><strong>Status:</strong> {{ ucfirst($invoice->status) }}</p>
            </td>
        </tr>
    </table>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Item</th>
                @if($invoice->is_gst)<th>HSN</th>@endif
                <th>Qty</th>
                <th>Unit</th>
                <th class="text-right">Rate (₹)</th>
                <th class="text-right">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item->item_name }}</td>
                @if($invoice->is_gst)<td>{{ $item->hsn_code ?? '-' }}</td>@endif
                <td>{{ $item->quantity }}</td>
                <td>{{ $item->unit }}</td>
                <td class="text-right">₹{{ number_format($item->rate, 2) }}</td>
                <td class="text-right">₹{{ number_format($item->amount, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr><td>Subtotal</td><td class="text-right">₹{{ number_format($invoice->subtotal, 2) }}</td></tr>
            @if($invoice->is_gst)
                @if($invoice->cgst_amount > 0)<tr><td>CGST ({{ $invoice->cgst_rate }}%)</td><td class="text-right">₹{{ number_format($invoice->cgst_amount, 2) }}</td></tr>@endif
                @if($invoice->sgst_amount > 0)<tr><td>SGST ({{ $invoice->sgst_rate }}%)</td><td class="text-right">₹{{ number_format($invoice->sgst_amount, 2) }}</td></tr>@endif
                @if($invoice->igst_amount > 0)<tr><td>IGST ({{ $invoice->igst_rate }}%)</td><td class="text-right">₹{{ number_format($invoice->igst_amount, 2) }}</td></tr>@endif
            @endif
            @if($invoice->discount > 0)<tr><td>Discount</td><td class="text-right">-₹{{ number_format($invoice->discount, 2) }}</td></tr>@endif
            <tr class="grand-total"><td><strong>Grand Total</strong></td><td class="text-right"><strong>₹{{ number_format($invoice->grand_total, 2) }}</strong></td></tr>
            @if($invoice->amount_paid > 0)<tr><td>Paid</td><td class="text-right">₹{{ number_format($invoice->amount_paid, 2) }}</td></tr>@endif
            @if($invoice->balance_due > 0)<tr style="color: #e94560;"><td><strong>Balance Due</strong></td><td class="text-right"><strong>₹{{ number_format($invoice->balance_due, 2) }}</strong></td></tr>@endif
        </table>
    </div>

    @if($invoice->notes)
    <div style="padding: 15px 20px; margin-top: 15px;">
        <h3 style="font-size: 12px; color: #1a1a2e;">Notes:</h3>
        <p style="font-size: 11px; color: #666;">{{ $invoice->notes }}</p>
    </div>
    @endif

    <div class="footer">
        <p>Thank you for your business! | Generated by FactoryERP</p>
    </div>
</body>
</html>
