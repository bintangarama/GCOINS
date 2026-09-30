<?php

namespace App\Exceptions;

use DomainException;

class InvalidVoucherStateException extends DomainException
{
    public function __construct(string $message = 'Status voucher tidak mengizinkan transisi ini.')
    {
        parent::__construct($message, 422);
    }
}
