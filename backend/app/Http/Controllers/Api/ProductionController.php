<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Production;
use App\Models\Material;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;

class ProductionController extends Controller
{
    public function index(Request $request)
    {
        $query = Production::with(['creator:id,name', 'material:id,name,code']);

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }
        if ($request->filled('shift')) {
            $query->where('shift', $request->shift);
        }
        if ($request->filled('item')) {
            $query->where('item', 'like', "%{$request->item}%");
        }
        if ($request->filled('operator')) {
            $query->where('operator', 'like', "%{$request->operator}%");
        }
        if ($request->filled('machine')) {
            $query->where('machine', $request->machine);
        }

        $productions = $query->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 25);

        return response()->json($productions);
    }

    public function store(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'shift' => 'required|in:day,night',
            'item' => 'required|string|max:255',
            'mould' => 'nullable|string|max:255',
            'shots' => 'required|integer|min:0',
            'cavity' => 'required|integer|min:1',
            'weight_per_piece' => 'required|numeric|min:0',
            'wastage_weight' => 'nullable|numeric|min:0',
            'operator' => 'required|string|max:255',
            'machine' => 'nullable|string|max:255',
            'material_id' => 'nullable|exists:materials,id',
            'remarks' => 'nullable|string',
        ]);

        $production = Production::create([
            ...$request->all(),
            'created_by' => auth()->id(),
        ]);

        // Auto-reduce material stock if material is linked
        if ($production->material_id && $production->total_weight > 0) {
            $material = Material::find($production->material_id);
            if ($material) {
                $totalUsed = $production->total_weight + ($production->wastage_weight ?? 0);
                $material->reduceStock($totalUsed, 'consumption', auth()->id(), "Production #{$production->id}");

                // Check low stock
                if ($material->isLowStock()) {
                    Notification::sendToAdmins(
                        'low_stock',
                        'Low Stock Alert',
                        "Material '{$material->name}' stock is low! Current: {$material->current_stock} {$material->unit}",
                        ['material_id' => $material->id, 'current_stock' => $material->current_stock]
                    );
                }
            }
        }

        // Notify admins of new production
        Notification::sendToAdmins(
            'production',
            'New Production Entry',
            "{$production->operator} produced {$production->production_qty} pcs of {$production->item} ({$production->shift} shift)",
            ['production_id' => $production->id]
        );

        ActivityLog::log('production_created', 'Production', $production->id);

        return response()->json([
            'message' => 'Production entry created.',
            'production' => $production->load('creator:id,name', 'material:id,name'),
        ], 201);
    }

    public function show(Production $production)
    {
        return response()->json($production->load('creator:id,name', 'material:id,name,code'));
    }

    public function update(Request $request, Production $production)
    {
        $request->validate([
            'date' => 'sometimes|date',
            'shift' => 'sometimes|in:day,night',
            'item' => 'sometimes|string|max:255',
            'shots' => 'sometimes|integer|min:0',
            'cavity' => 'sometimes|integer|min:1',
            'weight_per_piece' => 'sometimes|numeric|min:0',
            'wastage_weight' => 'nullable|numeric|min:0',
            'operator' => 'sometimes|string|max:255',
            'machine' => 'nullable|string|max:255',
            'material_id' => 'nullable|exists:materials,id',
            'remarks' => 'nullable|string',
        ]);

        $old = $production->toArray();
        $production->update($request->all());
        ActivityLog::log('production_updated', 'Production', $production->id, $old, $production->toArray());

        return response()->json([
            'message' => 'Production entry updated.',
            'production' => $production->fresh()->load('creator:id,name', 'material:id,name'),
        ]);
    }

    public function destroy(Production $production)
    {
        ActivityLog::log('production_deleted', 'Production', $production->id, $production->toArray());
        $production->delete();
        return response()->json(['message' => 'Production entry deleted.']);
    }

    // Shift comparison analytics
    public function shiftComparison(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $dayShift = Production::byShift('day')
            ->byDateRange($request->date_from, $request->date_to)
            ->selectRaw('
                COUNT(*) as entries,
                SUM(production_qty) as total_qty,
                SUM(total_weight) as total_weight,
                SUM(wastage_weight) as total_wastage,
                AVG(shots) as avg_shots
            ')->first();

        $nightShift = Production::byShift('night')
            ->byDateRange($request->date_from, $request->date_to)
            ->selectRaw('
                COUNT(*) as entries,
                SUM(production_qty) as total_qty,
                SUM(total_weight) as total_weight,
                SUM(wastage_weight) as total_wastage,
                AVG(shots) as avg_shots
            ')->first();

        // Operator performance
        $operatorPerformance = Production::byDateRange($request->date_from, $request->date_to)
            ->selectRaw('operator, shift, COUNT(*) as entries, SUM(production_qty) as total_qty, SUM(total_weight) as total_weight')
            ->groupBy('operator', 'shift')
            ->orderByDesc('total_qty')
            ->get();

        return response()->json([
            'day_shift' => $dayShift,
            'night_shift' => $nightShift,
            'operator_performance' => $operatorPerformance,
        ]);
    }

    // Daily production summary
    public function dailySummary(Request $request)
    {
        $date = $request->date ?? today()->toDateString();

        $summary = Production::whereDate('date', $date)
            ->selectRaw('
                shift,
                COUNT(*) as entries,
                SUM(production_qty) as total_qty,
                SUM(total_weight) as total_weight,
                SUM(wastage_weight) as total_wastage
            ')
            ->groupBy('shift')
            ->get();

        $items = Production::whereDate('date', $date)
            ->selectRaw('item, SUM(production_qty) as total_qty, SUM(total_weight) as total_weight')
            ->groupBy('item')
            ->orderByDesc('total_qty')
            ->get();

        return response()->json([
            'date' => $date,
            'shift_summary' => $summary,
            'item_summary' => $items,
        ]);
    }
}
