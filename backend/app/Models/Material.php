<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Material extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'code', 'category', 'unit', 'current_stock',
        'minimum_stock', 'price_per_unit', 'supplier', 'description', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'current_stock' => 'decimal:3',
            'minimum_stock' => 'decimal:3',
            'price_per_unit' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function transactions()
    {
        return $this->hasMany(MaterialTransaction::class);
    }

    public function productions()
    {
        return $this->hasMany(Production::class);
    }

    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->minimum_stock;
    }

    public function addStock(float $quantity, float $price, string $type = 'purchase', ?int $userId = null, ?string $remarks = null): void
    {
        $this->current_stock += $quantity;
        $this->save();

        $this->transactions()->create([
            'type' => $type,
            'quantity' => $quantity,
            'price_per_unit' => $price,
            'total_amount' => $quantity * $price,
            'stock_after' => $this->current_stock,
            'remarks' => $remarks,
            'created_by' => $userId ?? auth()->id(),
        ]);
    }

    public function reduceStock(float $quantity, string $type = 'consumption', ?int $userId = null, ?string $remarks = null): void
    {
        $this->current_stock -= $quantity;
        $this->save();

        $this->transactions()->create([
            'type' => $type,
            'quantity' => -$quantity,
            'price_per_unit' => $this->price_per_unit,
            'total_amount' => $quantity * $this->price_per_unit,
            'stock_after' => $this->current_stock,
            'remarks' => $remarks,
            'created_by' => $userId ?? auth()->id(),
        ]);
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('current_stock', '<=', 'minimum_stock');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
