<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $targetUser = $this->route('user');

        return $this->user()?->can('update', $targetUser) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $allowedRoles = ['SOA', 'SS', 'SAC', 'SM'];
        if ($this->user()?->role === 'SYSTEM_ADMIN') {
            $allowedRoles[] = 'SYSTEM_ADMIN';
        }

        return [
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'phone_number' => ['nullable', 'string', 'max:20'],
        ];
    }
}
