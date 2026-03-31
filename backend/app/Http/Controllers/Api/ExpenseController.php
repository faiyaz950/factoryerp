<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category:id,name', 'creator:id,name']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('date', 'desc')->paginate($request->per_page ?? 25)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:expense_categories,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
            'receipt' => 'nullable|image|max:5120',
            'payment_method' => 'required|in:cash,upi,bank_transfer,other',
        ]);

        $data = $request->except('receipt');
        $data['created_by'] = auth()->id();

        if ($request->hasFile('receipt')) {
            $data['receipt'] = $request->file('receipt')->store('receipts', 'public');
        }

        $expense = Expense::create($data);
        ActivityLog::log('expense_created', 'Expense', $expense->id);

        return response()->json([
            'message' => 'Expense recorded.',
            'expense' => $expense->load('category:id,name'),
        ], 201);
    }

    public function show(Expense $expense)
    {
        return response()->json($expense->load('category', 'creator:id,name'));
    }

    public function update(Request $request, Expense $expense)
    {
        $request->validate([
            'category_id' => 'sometimes|exists:expense_categories,id',
            'date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0.01',
            'description' => 'sometimes|string|max:500',
            'payment_method' => 'sometimes|in:cash,upi,bank_transfer,other',
        ]);

        $old = $expense->toArray();
        $expense->update($request->all());
        ActivityLog::log('expense_updated', 'Expense', $expense->id, $old, $expense->toArray());

        return response()->json(['message' => 'Expense updated.', 'expense' => $expense->load('category:id,name')]);
    }

    public function destroy(Expense $expense)
    {
        ActivityLog::log('expense_deleted', 'Expense', $expense->id, $expense->toArray());
        $expense->delete();
        return response()->json(['message' => 'Expense deleted.']);
    }

    // Categories
    public function categories()
    {
        return response()->json(ExpenseCategory::withCount('expenses')->orderBy('name')->get());
    }

    public function storeCategory(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories',
            'description' => 'nullable|string',
        ]);

        $category = ExpenseCategory::create($request->all());
        return response()->json(['message' => 'Category created.', 'category' => $category], 201);
    }

    public function deleteCategory(ExpenseCategory $category)
    {
        $category->delete();
        return response()->json(['message' => 'Category deleted.']);
    }

    // Daily expense summary
    public function dailySummary(Request $request)
    {
        $date = $request->date ?? today()->toDateString();

        $expenses = Expense::with('category:id,name')
            ->whereDate('date', $date)
            ->get();

        $byCategory = $expenses->groupBy('category.name')->map(fn($items) => [
            'count' => $items->count(),
            'total' => $items->sum('amount'),
        ]);

        return response()->json([
            'date' => $date,
            'total' => $expenses->sum('amount'),
            'count' => $expenses->count(),
            'by_category' => $byCategory,
            'expenses' => $expenses,
        ]);
    }
}
