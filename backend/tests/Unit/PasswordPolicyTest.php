<?php

namespace Tests\Unit;

use App\Support\BoonApiSupport;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class PasswordPolicyTest extends TestCase
{
    public function test_policy_accepts_password_without_symbol(): void
    {
        $this->assertNull($this->passwordPolicyError('Password12'));
    }

    public function test_policy_still_requires_a_number(): void
    {
        $this->assertSame(
            'Password must include a number',
            $this->passwordPolicyError('PasswordAb')
        );
    }

    private function passwordPolicyError(string $password): ?string
    {
        $support = new class {
            use BoonApiSupport;
        };

        $method = (new ReflectionClass($support))->getMethod('passwordPolicyError');

        return $method->invoke($support, $password);
    }
}
