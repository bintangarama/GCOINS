<?php

namespace App\Http\Requests\Voucher;

use App\Models\PettyCashCategory;
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

        $validCategories = PettyCashCategory::forStore($this->user()?->store_id)
            ->active()
            ->pluck('code')
            ->merge(PettyCashVoucher::CATEGORIES)
            ->unique()
            ->all();

        $isSubmit = (bool) $this->boolean('is_submit');

        return [
            'amount_cents' => ['required', 'integer', 'min:1', "max:{$imprestFundCents}"],
            'receipt_date' => ['nullable', 'date'],
            'purpose' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::in($validCategories)],
            'receipt_image' => [
                $isSubmit ? 'required' : 'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
            'item_photo' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
            'is_submit' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount_cents.required' => 'Nominal pengeluaran wajib diisi.',
            'amount_cents.min' => 'Nominal pengeluaran minimal Rp 1.',
            'amount_cents.max' => 'Nominal pengeluaran tidak boleh melebihi plafon kas kecil.',
            'receipt_date.date' => 'Format tanggal bon tidak valid.',
            'purpose.required' => 'Keperluan pengeluaran wajib diisi.',
            'purpose.max' => 'Keperluan maksimal 255 karakter.',
            'category.required' => 'Kategori pengeluaran wajib dipilih.',
            'category.in' => 'Kategori pengeluaran tidak valid.',
            'receipt_image.required' => 'Foto kuitansi/bukti wajib dilampirkan sebelum pengajuan.',
            'receipt_image.file' => 'Lampiran kuitansi harus berupa berkas yang valid.',
            'receipt_image.mimes' => 'Format lampiran kuitansi harus berupa JPG, JPEG, PNG, WebP, atau PDF.',
            'receipt_image.max' => 'Ukuran berkas kuitansi maksimal adalah 5 MB.',
            'item_photo.file' => 'Lampiran foto barang harus berupa berkas yang valid.',
            'item_photo.mimes' => 'Format lampiran foto barang harus berupa JPG, JPEG, PNG, WebP, atau PDF.',
            'item_photo.max' => 'Ukuran berkas foto barang maksimal adalah 5 MB.',
        ];
    }
}
