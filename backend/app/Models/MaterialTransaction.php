<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialTransaction extends Model
{
    protected $fillable = [
        'material_id', 'type', 'quantity', 'price_per_unit',
        'total_amount', 'stock_after', 'reference', 'remarks', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'price_per_unit' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'stock_after' => 'decimal:3',
        ];
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
