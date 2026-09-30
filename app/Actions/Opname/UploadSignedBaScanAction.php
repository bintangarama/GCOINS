<?php

namespace App\Actions\Opname;

use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\CashOpnameSession;
use App\Models\User;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UploadSignedBaScanAction
{
    /**
     * Upload physical signed Berita Acara scan and attach to opname session (FR-RPT-05).
     *
     * @throws DomainException
     * @throws AuthorizationException
     */
    public function execute(
        CashOpnameSession $session,
        UploadedFile $file,
        User $actor,
        ?string $ipAddress = null
    ): CashOpnameSession {
        // Enforce store scoping
        if ($actor->role !== 'SYSTEM_ADMIN' && $actor->store_id !== $session->store_id) {
            throw new AuthorizationException('Anda tidak berwenang mengunggah dokumen untuk toko lain.');
        }

        // Roles: SAC or SM (or SYSTEM_ADMIN)
        if (! in_array($actor->role, ['SAC', 'SM', 'SYSTEM_ADMIN'], true)) {
            throw new AuthorizationException('Hanya SAC atau Store Manager yang berwenang mengunggah berkas scan Berita Acara.');
        }

        // Status requirement: must be VERIFIED_SS or APPROVED
        if (! in_array($session->status, [CashOpnameSession::STATUS_VERIFIED_SS, CashOpnameSession::STATUS_APPROVED], true)) {
            throw new DomainException('Scan Berita Acara fisik hanya dapat diunggah setelah verifikasi saksi atau pengesahan final.');
        }

        return DB::transaction(function () use ($session, $file, $actor, $ipAddress) {
            $storeCode = $session->store?->code ?? 'STORE';
            $subPath = "uploads/opname/{$storeCode}/".now()->format('Y/m');
            $filePath = $file->store($subPath, 'public');
            $url = Storage::url($filePath);

            $oldUrl = $session->signed_ba_scan_url;

            // Create Attachment record
            Attachment::create([
                'store_id' => $session->store_id,
                'entity_type' => 'CASH_OPNAME',
                'entity_id' => $session->id,
                'category' => 'SIGNED_BA_SCAN',
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $url,
                'file_size_bytes' => $file->getSize(),
                'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                'uploaded_by_id' => $actor->id,
                'created_at' => now(),
            ]);

            // Update session
            $session->update([
                'signed_ba_scan_url' => $url,
            ]);

            // Audit log (Rule 10)
            AuditLog::create([
                'store_id' => $session->store_id,
                'entity_name' => CashOpnameSession::class,
                'entity_id' => $session->id,
                'action' => 'UPLOAD_SIGNED_BA',
                'performed_by_id' => $actor->id,
                'old_values' => ['signed_ba_scan_url' => $oldUrl],
                'new_values' => [
                    'signed_ba_scan_url' => $url,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                ],
                'ip_address' => $ipAddress,
            ]);

            return $session->fresh();
        });
    }
}
