<?php

namespace App\Exceptions;

use DomainException;

class ForbiddenSelfApprovalException extends DomainException
{
    public function __construct(string $message = 'Anda tidak dapat menyetujui pengajuan milik sendiri.')
    {
        parent::__construct($message, 403);
    }
}
