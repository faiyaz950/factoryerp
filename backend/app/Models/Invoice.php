<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number', 'party_id', 'invoice_date', 'due_date',
        'is_gst', 'subtotal', 'cgst_rate', 'sgst_rate', 'igst_rate',
        'cgst_amount', 'sgst_amount', 'igst_amount', 'total_tax',
        'discount', 'grand_total', 'amount_paid', 'balance_due',
        'status', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'is_gst' => 'boolean',
            'subtotal' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'balance_due' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($invoice) {
            if (empty($invoice->invoice_number)) {
                $invoice->invoice_number = self::generateInvoiceNumber();
            }
        });
    }

    public static function generateInvoiceNumber(): string
    {
        $year = date('Y');
        $lastInvoice = self::where('invoice_number', 'like', "INV-{$year}-%")
            ->orderBy('invoice_number', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) substr($lastInvoice->invoice_number, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf("INV-%s-%04d", $year, $nextNumber);
    }

    public function party()
    {
        return $this->belongsTo(Party::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function calculateTotals(): void
    {
        $this->subtotal = $this->items()->sum('amount');

        if ($this->is_gst) {
            $this->cgst_amount = $this->subtotal * ($this->cgst_rate / 100);
            $this->sgst_amount = $this->subtotal * ($this->sgst_rate / 100);
            $this->igst_amount = $this->subtotal * ($this->igst_rate / 100);
            $this->total_tax = $this->cgst_amount + $this->sgst_amount + $this->igst_amount;
        }

        $this->grand_total = $this->subtotal + $this->total_tax - $this->discount;
        $this->balance_due = $this->grand_total - $this->amount_paid;
        $this->status = $this->balance_due <= 0 ? 'paid' : ($this->amount_paid > 0 ? 'partial' : $this->status);
        $this->save();
    }

    public function getWhatsappShareUrl(): string
    {
        $message = urlencode(
            "Invoice: {$this->invoice_number}\n" .
            "Amount: ₹" . number_format($this->grand_total, 2) . "\n" .
            "Due: ₹" . number_format($this->balance_due, 2) . "\n" .
            "Date: {$this->invoice_date->format('d/m/Y')}"
        );
        return "https://wa.me/?text={$message}";
    }
}
