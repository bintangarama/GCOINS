<?php

namespace App\Http\Requests\Opname;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBriSubledgerRequest extends FormRequest
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
            'bri_mutation_total_cents' => ['nullable', 'integer', 'min:0'],
            'statement_proof' => ['nullable', 'file', 'mimes:webp,jpg,jpeg,png,pdf', 'max:2048'],
            'custom_allocations' => ['nullable', 'array'],
            'custom_allocations.*.name' => ['required_with:custom_allocations', 'string', 'max:100'],
            'custom_allocations.*.amount_cents' => ['required_with:custom_allocations', 'integer', 'min:0'],
            'custom_allocations.*.notes' => ['nullable', 'string', 'max:255'],
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
            'bri_mutation_total_cents.integer' => 'Saldo mutasi BRI harus berupa angka bilangan bulat.',
            'bri_mutation_total_cents.min' => 'Saldo mutasi BRI tidak boleh bernilai negatif.',
            'statement_proof.file' => 'Bukti rekening koran harus berupa berkas dokumen/gambar.',
            'statement_proof.mimes' => 'Format bukti rekening koran harus webp, jpg, png, atau pdf.',
            'statement_proof.max' => 'Ukuran bukti rekening koran maksimal 2MB.',
            'custom_allocations.*.name.required_with' => 'Nama pos alokasi kustom wajib diisi.',
            'custom_allocations.*.amount_cents.required_with' => 'Nominal alokasi kustom wajib diisi.',
            'custom_allocations.*.amount_cents.min' => 'Nominal alokasi kustom tidak boleh negatif.',
        ];
    }
}
