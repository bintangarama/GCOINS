<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', User::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $actor = $this->user();

        $allowedRoles = match ($actor?->role) {
            'SYSTEM_ADMIN' => ['SOA', 'SS', 'SAC', 'SM', 'SYSTEM_ADMIN'],
            'SM' => ['SOA', 'SS', 'SAC', 'SM'],
            'SAC' => ['SOA', 'SAC'],
            default => [],
        };

        return [
            'nik' => ['required', 'string', 'max:20', 'unique:users,nik'],
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'pin' => ['nullable', 'string', 'min:6', 'max:10'],
        ];
    }
}
