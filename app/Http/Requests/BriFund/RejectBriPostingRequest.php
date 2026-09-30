<?php

namespace App\Http\Requests\BriFund;

use App\Models\BriFundPosting;
use Illuminate\Foundation\Http\FormRequest;

class RejectBriPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var BriFundPosting|null $posting */
        $posting = $this->route('posting');

        return $posting ? ($this->user()?->can('reject', $posting) ?? false) : false;
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'Alasan penolakan pengeluaran wajib diisi.',
            'rejection_reason.min' => 'Alasan penolakan minimal 3 karakter.',
            'rejection_reason.max' => 'Alasan penolakan maksimal 255 karakter.',
        ];
    }
}
