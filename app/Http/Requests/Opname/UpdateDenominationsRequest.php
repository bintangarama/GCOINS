<?php

namespace App\Http\Requests\Opname;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDenominationsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'SAC';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array'],
            'items.*.item_definition_id' => ['required', 'string', 'exists:opname_item_definitions,id'],
            'items.*.count' => ['required', 'integer', 'min:0'],
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
            'items.required' => 'Daftar pecahan uang wajib disertakan.',
            'items.*.item_definition_id.required' => 'ID definisi pecahan wajib diisi.',
            'items.*.item_definition_id.exists' => 'Definisi pecahan tidak valid.',
            'items.*.count.required' => 'Jumlah keping/lembar wajib diisi.',
            'items.*.count.integer' => 'Jumlah harus berupa bilangan bulat.',
            'items.*.count.min' => 'Jumlah tidak boleh negatif.',
        ];
    }
}
