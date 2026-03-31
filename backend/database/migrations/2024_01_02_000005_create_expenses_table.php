<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('expense_categories')->cascadeOnDelete();
            $table->date('date');
            $table->decimal('amount', 14, 2);
            $table->string('description');
            $table->string('receipt')->nullable();
            $table->enum('payment_method', ['cash', 'upi', 'bank_transfer', 'other'])->default('cash');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['date', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
    }
};
