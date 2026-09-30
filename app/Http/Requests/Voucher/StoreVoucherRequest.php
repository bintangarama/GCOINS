<?php

namespace App\Http\Requests\Voucher;

use App\Models\PettyCashVoucher;
use App\Models\StoreOpnameConfig;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', PettyCashVoucher::class) ?? false;
    }

    public function rules(): array
    {
        $imprestFundCents = 500000000;
        if ($this->user()?->store_id) {
            $config = StoreOpnameConfig::where('store_id', $this->user()->store_id)
                ->where('opname_type', 'KAS_KECIL')
                ->first();
            if ($config) {
                $imprestFundCents = $config->imprest_fund_cents;
            }
        }

        return [
            'amount_cents' => ['required', 'integer', 'min:1', "max:{$imprestFundCents}"],
            'purpose' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(PettyCashVoucher::CATEGORIES)],
            'receipt_image' => ['nullable'],
            'item_photo' => ['nullable'],
            'is_submit' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount_cents.required' => 'Nominal pengeluaran wajib diisi.',
            'amount_cents.min' => 'Nominal pengeluaran minimal Rp 1.',
            'amount_cents.max' => 'Nominal pengeluaran tidak boleh melebihi plafon kas kecil.',
            'purpose.required' => 'Keperluan pengeluaran wajib diisi.',
            'purpose.max' => 'Keperluan maksimal 255 karakter.',
            'category.required' => 'Kategori pengeluaran wajib dipilih.',
            'category.in' => 'Kategori pengeluaran tidak valid.',
        ];
    }
}
