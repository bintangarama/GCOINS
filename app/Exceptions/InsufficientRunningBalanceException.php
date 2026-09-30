<?php

namespace App\Exceptions;

use DomainException;

class InsufficientRunningBalanceException extends DomainException
{
    public function __construct(string $message = 'Saldo berjalan tidak mencukupi untuk pengeluaran ini.')
    {
        parent::__construct($message, 422);
    }
}
