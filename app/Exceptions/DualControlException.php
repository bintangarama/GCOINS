<?php

namespace App\Exceptions;

use DomainException;

class DualControlException extends DomainException
{
    public function __construct(string $message = 'Dual Control: Pengguna yang membuat pengeluaran tidak dapat menyetujuinya sendiri.')
    {
        parent::__construct($message, 403);
    }
}
