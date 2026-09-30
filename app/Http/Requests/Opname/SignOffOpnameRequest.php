<?php

namespace App\Http\Requests\Opname;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SignOffOpnameRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'SM';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'confirm_understanding' => ['required', 'boolean', 'accepted'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'confirm_understanding.required' => 'Konfirmasi pemahaman selisih kas wajib dicentang.',
            'confirm_understanding.accepted' => 'Anda harus menyetujui dan memahami selisih kas opname sebelum melakukan persetujuan (sign-off).',
            'notes.max' => 'Catatan maksimal 500 karakter.',
        ];
    }
}
