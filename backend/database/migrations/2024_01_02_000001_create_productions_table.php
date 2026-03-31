<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productions', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->enum('shift', ['day', 'night']);
            $table->string('item');
            $table->string('mould')->nullable();
            $table->integer('shots')->default(0);
            $table->integer('cavity')->default(1);
            $table->integer('production_qty')->default(0);
            $table->decimal('weight_per_piece', 10, 3)->default(0);
            $table->decimal('total_weight', 12, 3)->default(0);
            $table->decimal('wastage_weight', 10, 3)->default(0);
            $table->string('operator');
            $table->string('machine')->nullable();
            $table->foreignId('material_id')->nullable()->constrained('materials')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['date', 'shift']);
            $table->index('item');
            $table->index('operator');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productions');
    }
};
