<?php

use App\Http\Controllers\BoonAnalyticsController;
use App\Http\Controllers\BoonAuthController;
use App\Http\Controllers\BoonDocumentController;
use App\Http\Controllers\BoonRoomController;
use App\Http\Controllers\BoonSupplierController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'app' => 'BOON API']));
Route::get('/public/documents/{id}/pdf', [BoonDocumentController::class, 'publicDocumentPdf'])
    ->middleware('signed')
    ->name('api.public.documents.pdf');

Route::post('/auth/register', [BoonAuthController::class, 'register']);
Route::post('/auth/login', [BoonAuthController::class, 'login']);
Route::post('/auth/verify-phone', [BoonAuthController::class, 'verifyPhone']);
Route::post('/auth/resend-code', [BoonAuthController::class, 'resendCode']);
Route::post('/auth/refresh', [BoonAuthController::class, 'refresh']);

Route::middleware('boon.auth')->group(function () {
    Route::get('/me', [BoonAuthController::class, 'me']);
    Route::put('/me/profile', [BoonAuthController::class, 'updateMe']);
    Route::put('/me/password', [BoonAuthController::class, 'updatePassword']);

    Route::get('/analytics/overview', [BoonAnalyticsController::class, 'overview']);

    Route::get('/documents/personal', [BoonDocumentController::class, 'listPersonalDocuments'])->middleware('boon.role:SUPPLIER');
    Route::post('/documents', [BoonDocumentController::class, 'createDocument'])->middleware('boon.role:SUPPLIER');
    Route::get('/documents/{id}', [BoonDocumentController::class, 'getDocument']);
    Route::delete('/documents/{id}', [BoonDocumentController::class, 'deleteDocument'])->middleware('boon.role:SUPPLIER');
    Route::get('/documents/{id}/share', [BoonDocumentController::class, 'documentShare']);
    Route::post('/documents/{id}/export-pdf', [BoonDocumentController::class, 'exportDocumentPdf']);
    Route::get('/documents/{id}/pdf', [BoonDocumentController::class, 'documentPdf']);

    Route::get('/me/documents', [BoonDocumentController::class, 'listMyDocuments'])->middleware('boon.role:SUPPLIER');
    Route::post('/me/documents', [BoonDocumentController::class, 'createMyDocument'])->middleware('boon.role:SUPPLIER');
    Route::post('/me/documents/{id}/export-pdf', [BoonDocumentController::class, 'exportMyDocumentPdf'])->middleware('boon.role:SUPPLIER');

    Route::get('/users/suppliers', [BoonSupplierController::class, 'searchSuppliers'])->middleware('boon.role:OWNER,WORKER');
    Route::get('/supplier/profile', [BoonSupplierController::class, 'getProfile'])->middleware('boon.role:SUPPLIER');
    Route::put('/supplier/profile', [BoonSupplierController::class, 'upsertProfile'])->middleware('boon.role:SUPPLIER');

    Route::post('/rooms', [BoonRoomController::class, 'createRoom'])->middleware('boon.role:OWNER');
    Route::get('/rooms', [BoonRoomController::class, 'listRooms']);
    Route::post('/rooms/join', [BoonRoomController::class, 'joinRoom'])->middleware('boon.role:WORKER');
    Route::get('/rooms/{roomId}', [BoonRoomController::class, 'roomDetails']);
    Route::get('/rooms/{roomId}/members', [BoonRoomController::class, 'roomMembers']);
    Route::post('/rooms/{roomId}/read', [BoonRoomController::class, 'markRoomRead']);
    Route::put('/rooms/{roomId}/status', [BoonRoomController::class, 'updateRoomStatus'])->middleware('boon.role:OWNER');
    Route::delete('/rooms/{roomId}/members/{userId}', [BoonRoomController::class, 'removeRoomMember'])->middleware('boon.role:OWNER');
    Route::get('/rooms/{roomId}/documents', [BoonRoomController::class, 'listRoomDocuments']);
    Route::post('/rooms/{roomId}/documents', [BoonDocumentController::class, 'createRoomDocument'])->middleware('boon.role:SUPPLIER');
    Route::get('/rooms/{roomId}/stream', [BoonRoomController::class, 'roomStream']);

    Route::get('/join-requests', [BoonRoomController::class, 'listJoinRequests'])->middleware('boon.role:OWNER');
    Route::post('/join-requests/{requestId}/decision', [BoonRoomController::class, 'decideJoinRequest'])->middleware('boon.role:OWNER');

    Route::post('/rooms/{roomId}/workers/{workerId}/link-supplier', [BoonSupplierController::class, 'linkSupplier'])->middleware('boon.role:WORKER');
    Route::post('/rooms/{roomId}/suppliers', [BoonSupplierController::class, 'addSupplierToRoom'])->middleware('boon.role:WORKER');
    Route::get('/rooms/{roomId}/worker-suppliers', [BoonSupplierController::class, 'listWorkerSuppliers']);
    Route::get('/rooms/{roomId}/worker-suppliers/me', [BoonSupplierController::class, 'listMyWorkerSuppliers'])->middleware('boon.role:WORKER');
    Route::get('/rooms/{roomId}/suppliers', [BoonSupplierController::class, 'listRoomSuppliers'])->middleware('boon.role:OWNER,WORKER');
    Route::delete('/rooms/{roomId}/suppliers/{supplierId}', [BoonSupplierController::class, 'unlinkRoomSupplier'])->middleware('boon.role:OWNER,WORKER');
});
