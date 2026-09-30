<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class BatchSettleVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'SAC';
    }

    public function rules(): array
    {
        return [
            'voucher_ids' => ['required', 'array', 'min:1'],
            'voucher_ids.*' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'voucher_ids.required' => 'Pilih minimal satu voucher untuk diselesaikan.',
            'voucher_ids.min' => 'Pilih minimal satu voucher untuk diselesaikan.',
        ];
    }
}
