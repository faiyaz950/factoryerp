<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id', 'item_name', 'hsn_code', 'quantity', 'unit', 'rate', 'amount',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'rate' => 'decimal:2',
            'amount' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($item) {
            $item->amount = $item->quantity * $item->rate;
        });

        static::updating(function ($item) {
            $item->amount = $item->quantity * $item->rate;
        });
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
