<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Production extends Model
{
    use HasFactory;

    protected $fillable = [
        'date', 'shift', 'item', 'mould', 'shots', 'cavity',
        'production_qty', 'weight_per_piece', 'total_weight',
        'wastage_weight', 'operator', 'machine', 'material_id',
        'remarks', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'shots' => 'integer',
            'cavity' => 'integer',
            'production_qty' => 'integer',
            'weight_per_piece' => 'decimal:3',
            'total_weight' => 'decimal:3',
            'wastage_weight' => 'decimal:3',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($production) {
            $production->production_qty = $production->shots * $production->cavity;
            // weight_per_piece is stored in grams; total_weight is kg
            $production->total_weight = ($production->production_qty * $production->weight_per_piece) / 1000;
        });

        static::updating(function ($production) {
            $production->production_qty = $production->shots * $production->cavity;
            $production->total_weight = ($production->production_qty * $production->weight_per_piece) / 1000;
        });
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }

    public function scopeByShift($query, $shift)
    {
        return $query->where('shift', $shift);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('date', today());
    }
}
