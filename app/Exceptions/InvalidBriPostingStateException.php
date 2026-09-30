<?php

namespace App\Exceptions;

use DomainException;

class InvalidBriPostingStateException extends DomainException
{
    public function __construct(string $message = 'Status posting BRI tidak valid untuk aksi ini.')
    {
        parent::__construct($message, 422);
    }
}
