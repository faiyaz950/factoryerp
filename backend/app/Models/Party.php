<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Party extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'company_name', 'email', 'phone', 'gstin',
        'address', 'city', 'state', 'pincode', 'type',
        'opening_balance', 'current_balance', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'current_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function updateBalance(): void
    {
        $totalInvoiced = $this->invoices()->sum('grand_total');
        $totalPaid = $this->payments()->sum('amount');
        $this->current_balance = $this->opening_balance + $totalInvoiced - $totalPaid;
        $this->save();
    }

    public function scopeCustomers($query)
    {
        return $query->whereIn('type', ['customer', 'both']);
    }

    public function scopeSuppliers($query)
    {
        return $query->whereIn('type', ['supplier', 'both']);
    }

    public function scopeWithDues($query)
    {
        return $query->where('current_balance', '>', 0);
    }
}
