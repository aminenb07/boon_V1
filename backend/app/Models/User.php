<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'id',
        'phone',
        'email',
        'password_hash',
        'full_name',
        'default_role',
        'phone_verified_at',
        'status',
    ];

    public $incrementing = false;

    protected $keyType = 'string';

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
        ];
    }
}
