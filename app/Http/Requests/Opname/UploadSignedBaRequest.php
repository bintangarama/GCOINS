<?php

namespace App\Http\Requests\Opname;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UploadSignedBaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null && in_array($this->user()->role, ['SAC', 'SM', 'SYSTEM_ADMIN'], true);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'signed_ba' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:10240', // 10MB
            ],
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
            'signed_ba.required' => 'File scan Berita Acara bertanda tangan wajib diunggah.',
            'signed_ba.file' => 'Berkas yang diunggah tidak valid.',
            'signed_ba.mimes' => 'Format file harus berupa PDF, JPG, JPEG, PNG, atau WEBP.',
            'signed_ba.max' => 'Ukuran file maksimal adalah 10 MB.',
        ];
    }
}
