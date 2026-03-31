<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_number', 'party_id', 'invoice_id', 'amount',
        'method', 'reference_number', 'upi_screenshot',
        'payment_date', 'remarks', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($payment) {
            if (empty($payment->payment_number)) {
                $year = date('Y');
                $last = self::where('payment_number', 'like', "PAY-{$year}-%")
                    ->orderBy('payment_number', 'desc')->first();
                $next = $last ? ((int)substr($last->payment_number, -4)) + 1 : 1;
                $payment->payment_number = sprintf("PAY-%s-%04d", $year, $next);
            }
        });

        static::created(function ($payment) {
            if ($payment->invoice_id) {
                $invoice = $payment->invoice;
                if ($invoice) {
                    $invoice->amount_paid = $invoice->payments()->sum('amount');
                    $invoice->balance_due = $invoice->grand_total - $invoice->amount_paid;
                    $invoice->status = $invoice->balance_due <= 0 ? 'paid' : 'partial';
                    $invoice->save();
                }
            }
            $payment->party->updateBalance();
        });
    }

    public function party()
    {
        return $this->belongsTo(Party::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
