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
        $actor = $this->user();
        $targetUser = $this->route('user');

        $allowedRoles = match ($actor?->role) {
            'SYSTEM_ADMIN' => ['SOA', 'SS', 'SAC', 'SM', 'SYSTEM_ADMIN'],
            'SM' => ['SOA', 'SS', 'SAC', 'SM'],
            'SAC' => ['SOA', 'SAC'],
            default => [],
        };

        // User cannot change their own role (anti self-privilege escalation)
        if ($actor && $targetUser && $actor->id === $targetUser->id) {
            $allowedRoles = [$actor->role];
        }

        return [
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'phone_number' => ['nullable', 'string', 'max:20'],
        ];
    }
}
