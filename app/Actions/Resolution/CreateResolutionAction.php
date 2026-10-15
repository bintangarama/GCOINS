<?php

namespace App\Actions\Resolution;

use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\User;
use App\Models\VarianceResolution;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class CreateResolutionAction
{
    /**
     * Create a new variance resolution entry.
     *
     * @param  array{
     *     kind: string,
     *     amount_cents: int,
     *     reason: string,
     * }  $data
     *
     * @throws AuthorizationException
     * @throws DomainException
     */
    public function execute(
        CashOpnameSession $session,
        array $data,
        User $actor,
        ?UploadedFile $proofFile = null,
        ?string $ipAddress = null
    ): VarianceResolution {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        // Store scoping
        if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Anda tidak berwenang mengajukan resolusi untuk toko lain.');
        }

        // Only SAC, SS, SM, SYSTEM_ADMIN can create resolution
        if (! in_array($actor->role, ['SAC', 'SS', 'SM', 'SYSTEM_ADMIN'], true)) {
            throw new AuthorizationException('Hanya petugas toko yang berwenang mengajukan resolusi selisih.');
        }

        $amountCents = (int) ($data['amount_cents'] ?? 0);
        if ($amountCents <= 0) {
            throw new InvalidArgumentException('Nominal resolusi harus lebih besar dari 0.');
        }

        $kind = $data['kind'] ?? '';
        if (! in_array($kind, [VarianceResolution::KIND_REPLACED, VarianceResolution::KIND_WRITE_OFF, VarianceResolution::KIND_FOUND], true)) {
            throw new InvalidArgumentException('Jenis resolusi tidak valid.');
        }

        $reason = trim($data['reason'] ?? '');
        if (empty($reason)) {
            throw new InvalidArgumentException('Alasan penyelesaian selisih wajib diisi.');
        }

        return DB::transaction(function () use ($session, $amountCents, $kind, $reason, $actor, $proofFile, $ipAddress) {
            $proofUrl = null;
            if ($proofFile) {
                $storeCode = $session->store?->code ?? 'STORE';
                $path = $proofFile->store("uploads/resolutions/{$storeCode}/".now()->format('Y/m'), 'public');
                $proofUrl = Storage::url($path);

                Attachment::create([
                    'store_id' => $session->store_id,
                    'entity_type' => 'VARIANCE_RESOLUTION',
                    'entity_id' => $session->id,
                    'category' => 'RESOLUTION_PROOF',
                    'file_name' => $proofFile->getClientOriginalName(),
                    'file_path' => $proofUrl,
                    'file_size_bytes' => $proofFile->getSize(),
                    'mime_type' => $proofFile->getClientMimeType() ?: 'application/octet-stream',
                    'uploaded_by_id' => $actor->id,
                ]);
            }

            $resolution = VarianceResolution::create([
                'store_id' => $session->store_id,
                'session_id' => $session->id,
                'opname_type' => $session->opname_type,
                'kind' => $kind,
                'amount_cents' => $amountCents,
                'reason' => $reason,
                'proof_attachment_url' => $proofUrl,
                'status' => VarianceResolution::STATUS_PENDING,
                'created_by_id' => $actor->id,
            ]);

            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => VarianceResolution::class,
                'entity_id' => $resolution->id,
                'action' => 'CREATE_RESOLUTION',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => $resolution->toArray(),
                'ip_address' => $ipAddress,
            ]);

            return $resolution;
        });
    }
}
