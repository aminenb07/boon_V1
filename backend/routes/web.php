<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'BOON API',
        'status' => 'ok',
        'health' => url('/api/health'),
    ]);
});
