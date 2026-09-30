<?php

namespace App\Http\Requests\BriFund;

use App\Models\BriFundPosting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBriPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', BriFundPosting::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(BriFundPosting::CATEGORIES)],
            'custom_category_name' => [
                'nullable',
                'string',
                'max:100',
                Rule::requiredIf(fn () => $this->input('category') === BriFundPosting::CATEGORY_CUSTOM),
            ],
            'entity_name' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(BriFundPosting::TYPES)],
            'amount_cents' => ['required', 'integer', 'min:1'],
            'purpose' => ['required', 'string', 'max:255'],
            'proof_attachment' => ['nullable'],
        ];
    }

    public function messages(): array
    {
        return [
            'category.required' => 'Kategori posting wajib dipilih.',
            'category.in' => 'Kategori posting tidak valid.',
            'custom_category_name.required' => 'Nama kategori khusus wajib diisi jika memilih kategori CUSTOM.',
            'entity_name.required' => 'Nama entitas/mitra wajib diisi.',
            'type.required' => 'Tipe posting (INFLOW/OUTFLOW) wajib dipilih.',
            'type.in' => 'Tipe posting tidak valid.',
            'amount_cents.required' => 'Nominal mutasi wajib diisi.',
            'amount_cents.min' => 'Nominal mutasi minimal Rp 1.',
            'purpose.required' => 'Keterangan/tujuan mutasi wajib diisi.',
        ];
    }
}
