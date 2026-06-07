<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('Password1234');
        $now = now();

        $users = [
            [
                'phone' => '+212600000001',
                'email' => 'owner@boon.test',
                'full_name' => 'Boon Owner',
                'default_role' => 'OWNER',
            ],
            [
                'phone' => '+212600000002',
                'email' => 'worker.one@boon.test',
                'full_name' => 'Worker One',
                'default_role' => 'WORKER',
            ],
            [
                'phone' => '+212600000003',
                'email' => 'worker.two@boon.test',
                'full_name' => 'Worker Two',
                'default_role' => 'WORKER',
            ],
            [
                'phone' => '+212600000004',
                'email' => 'supplier.one@boon.test',
                'full_name' => 'Supplier One',
                'default_role' => 'SUPPLIER',
            ],
            [
                'phone' => '+212600000005',
                'email' => 'supplier.two@boon.test',
                'full_name' => 'Supplier Two',
                'default_role' => 'SUPPLIER',
            ],
        ];

        foreach ($users as $user) {
            $values = [
                'email' => $user['email'],
                'password_hash' => $password,
                'full_name' => $user['full_name'],
                'default_role' => $user['default_role'],
                'phone_verified_at' => $now,
                'status' => 'ACTIVE',
                'updated_at' => $now,
            ];

            if (DB::table('users')->where('phone', $user['phone'])->exists()) {
                DB::table('users')->where('phone', $user['phone'])->update($values);
                continue;
            }

            DB::table('users')->insert([
                'id' => (string) Str::uuid(),
                'phone' => $user['phone'],
                'created_at' => $now,
                ...$values,
            ]);
        }
    }
}
