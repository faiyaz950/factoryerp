<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;

class MaterialController extends Controller
{
    public function index(Request $request)
    {
        $query = Material::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('code', 'like', "%{$request->search}%");
            });
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->boolean('low_stock')) {
            $query->lowStock();
        }
        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        return response()->json(
            $query->orderBy('name')->paginate($request->per_page ?? 25)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:materials',
            'category' => 'nullable|string|max:255',
            'unit' => 'required|string|max:20',
            'current_stock' => 'required|numeric|min:0',
            'minimum_stock' => 'required|numeric|min:0',
            'price_per_unit' => 'required|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $material = Material::create($request->all());
        ActivityLog::log('material_created', 'Material', $material->id);

        return response()->json(['message' => 'Material created.', 'material' => $material], 201);
    }

    public function show(Material $material)
    {
        $material->load(['transactions' => function ($q) {
            $q->latest()->limit(50);
        }]);
        return response()->json($material);
    }

    public function update(Request $request, Material $material)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:materials,code,' . $material->id,
            'category' => 'nullable|string|max:255',
            'unit' => 'sometimes|string|max:20',
            'minimum_stock' => 'sometimes|numeric|min:0',
            'price_per_unit' => 'sometimes|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $old = $material->toArray();
        $material->update($request->all());
        ActivityLog::log('material_updated', 'Material', $material->id, $old, $material->toArray());

        return response()->json(['message' => 'Material updated.', 'material' => $material]);
    }

    public function destroy(Material $material)
    {
        ActivityLog::log('material_deleted', 'Material', $material->id, $material->toArray());
        $material->delete();
        return response()->json(['message' => 'Material deleted.']);
    }

    // Add stock (purchase)
    public function addStock(Request $request, Material $material)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0.001',
            'price_per_unit' => 'required|numeric|min:0',
            'remarks' => 'nullable|string',
        ]);

        $material->addStock($request->quantity, $request->price_per_unit, 'purchase', auth()->id(), $request->remarks);
        ActivityLog::log('stock_added', 'Material', $material->id);

        return response()->json([
            'message' => 'Stock added.',
            'material' => $material->fresh(),
        ]);
    }

    // Record wastage
    public function recordWastage(Request $request, Material $material)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0.001',
            'remarks' => 'nullable|string',
        ]);

        $material->reduceStock($request->quantity, 'wastage', auth()->id(), $request->remarks);

        if ($material->isLowStock()) {
            Notification::sendToAdmins(
                'low_stock',
                'Low Stock Alert',
                "Material '{$material->name}' is low! Current: {$material->current_stock} {$material->unit}",
                ['material_id' => $material->id]
            );
        }

        ActivityLog::log('wastage_recorded', 'Material', $material->id);

        return response()->json([
            'message' => 'Wastage recorded.',
            'material' => $material->fresh(),
        ]);
    }

    // Low stock alerts
    public function lowStockAlerts()
    {
        $materials = Material::lowStock()->active()->get();
        return response()->json($materials);
    }

    // Stock transactions history
    public function transactions(Request $request, Material $material)
    {
        $transactions = $material->transactions()
            ->with('creator:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 25);
        return response()->json($transactions);
    }

    // Categories list
    public function categories()
    {
        $categories = Material::select('category')
            ->distinct()
            ->whereNotNull('category')
            ->orderBy('category')
            ->pluck('category');
        return response()->json($categories);
    }
}
