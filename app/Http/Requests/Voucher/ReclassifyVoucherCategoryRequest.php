<?php

namespace App\Http\Requests\Voucher;

use App\Models\PettyCashCategory;
use App\Models\PettyCashVoucher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReclassifyVoucherCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $voucher = $this->route('voucher');

        return $voucher instanceof PettyCashVoucher
            && ($this->user()?->can('reclassifyCategory', $voucher) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $validCategories = PettyCashCategory::forStore($this->user()?->store_id)
            ->active()
            ->pluck('code')
            ->merge(PettyCashVoucher::CATEGORIES)
            ->unique()
            ->all();

        return [
            'category' => ['required', 'string', Rule::in($validCategories)],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category.required' => 'Kategori pengeluaran baru wajib dipilih.',
            'category.in' => 'Kategori pengeluaran yang dipilih tidak valid atau sudah tidak aktif.',
            'reason.max' => 'Catatan koreksi kategori maksimal 255 karakter.',
        ];
    }
}

