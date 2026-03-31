<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        User::create([
            'name' => 'Admin Owner',
            'email' => 'admin@factory.com',
            'password' => 'Admin@1234',
            'role' => 'admin',
            'phone' => '9876543210',
            'is_active' => true,
            'two_factor_verified' => true,
        ]);

        // Supervisor user
        User::create([
            'name' => 'Factory Supervisor',
            'email' => 'supervisor@factory.com',
            'password' => 'Super@1234',
            'role' => 'supervisor',
            'phone' => '9876543211',
            'is_active' => true,
            'two_factor_verified' => true,
        ]);

        // Default expense categories
        $categories = [
            'Electricity', 'Labour', 'Transport', 'Maintenance',
            'Raw Material', 'Packaging', 'Fuel', 'Miscellaneous',
            'Office Supplies', 'Rent',
        ];

        foreach ($categories as $cat) {
            ExpenseCategory::create(['name' => $cat]);
        }
    }
}
