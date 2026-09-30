<?php

namespace App\Actions\BriFund;

use App\Actions\Notification\SendNotificationAction;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\BriFundPosting;
use App\Models\Store;
use App\Models\User;
use App\Services\BriBalanceService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class CreatePostingAction
{
    public function __construct(
        protected BriBalanceService $balanceService,
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Create a new BRI fund posting (INFLOW or OUTFLOW).
     *
     * @param  array{
     *     category: string,
     *     custom_category_name?: ?string,
     *     entity_name: string,
     *     type: string,
     *     amount_cents: int,
     *     purpose: string,
     *     proof_attachment?: UploadedFile|string|null,
     * }  $data
     */
    public function execute(array $data, User $actor, ?string $ipAddress = null): BriFundPosting
    {
        if ($data['amount_cents'] <= 0) {
            throw new InvalidArgumentException('Nominal mutasi harus lebih besar dari 0.');
        }

        if (! in_array($data['type'], BriFundPosting::TYPES, true)) {
            throw new InvalidArgumentException("Tipe posting {$data['type']} tidak valid.");
        }

        if (! in_array($data['category'], BriFundPosting::CATEGORIES, true)) {
            throw new InvalidArgumentException("Kategori posting {$data['category']} tidak valid.");
        }

        $customCategoryName = null;
        if ($data['category'] === BriFundPosting::CATEGORY_CUSTOM) {
            $customCategoryName = trim($data['custom_category_name'] ?? '');
            if (empty($customCategoryName)) {
                throw new InvalidArgumentException('Nama kategori khusus wajib diisi jika memilih kategori CUSTOM.');
            }
        }

        $store = Store::findOrFail($actor->store_id);

        // Rule 7: Zero-Deficit Guard (Check 1 - at Creation time)
        if ($data['type'] === BriFundPosting::TYPE_OUTFLOW) {
            $this->balanceService->assertZeroDeficit(
                $store->id,
                $data['entity_name'],
                $data['amount_cents'],
                $data['category']
            );
        }

        // Status rule: INFLOW is immediately APPROVED; OUTFLOW is PENDING_SS
        $status = $data['type'] === BriFundPosting::TYPE_INFLOW
            ? BriFundPosting::STATUS_APPROVED
            : BriFundPosting::STATUS_PENDING_SS;

        return DB::transaction(function () use ($data, $actor, $store, $status, $customCategoryName, $ipAddress) {
            $posting = BriFundPosting::create([
                'store_id' => $store->id,
                'category' => $data['category'],
                'custom_category_name' => $customCategoryName,
                'entity_name' => trim($data['entity_name']),
                'type' => $data['type'],
                'amount_cents' => $data['amount_cents'],
                'purpose' => trim($data['purpose']),
                'proof_attachment_url' => null,
                'status' => $status,
                'created_by_id' => $actor->id,
                'approved_by_id' => null,
                'approved_at' => null,
                'rejection_reason' => null,
            ]);

            // Handle proof attachment if provided
            if (! empty($data['proof_attachment'])) {
                $proofUrl = $this->storeAttachment($data['proof_attachment'], $posting, $actor);
                $posting->update(['proof_attachment_url' => $proofUrl]);
            }

            // Create Audit Log
            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'BriFundPosting',
                'entity_id' => $posting->id,
                'action' => $data['type'] === BriFundPosting::TYPE_INFLOW ? 'CREATE_BRI_INFLOW' : 'CREATE_BRI_OUTFLOW',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => [
                    'category' => $posting->category,
                    'custom_category_name' => $posting->custom_category_name,
                    'entity_name' => $posting->entity_name,
                    'type' => $posting->type,
                    'amount_cents' => $posting->amount_cents,
                    'purpose' => $posting->purpose,
                    'status' => $posting->status,
                ],
                'ip_address' => $ipAddress,
            ]);

            // Notifications
            $formattedAmount = 'Rp '.number_format($posting->amount_cents / 100, 0, ',', '.');
            if ($data['type'] === BriFundPosting::TYPE_OUTFLOW) {
                $this->notificationAction->toStoreRoles(
                    $store->id,
                    ['SS', 'SM'],
                    'BRI_OUTFLOW_PENDING',
                    'Pengajuan Pengeluaran Dana BRI',
                    "Pengeluaran dana {$posting->entity_name} ({$posting->category}) sebesar {$formattedAmount} menunggu persetujuan.",
                    'BriFundPosting',
                    $posting->id,
                    $actor->id
                );
            } else {
                $this->notificationAction->toStoreRoles(
                    $store->id,
                    ['SS', 'SM'],
                    'BRI_INFLOW_RECORDED',
                    'Pemasukan Dana BRI Dicatat',
                    "Pemasukan dana {$posting->entity_name} ({$posting->category}) sebesar {$formattedAmount} telah dicatat.",
                    'BriFundPosting',
                    $posting->id,
                    $actor->id
                );
            }

            return $posting;
        });
    }

    protected function storeAttachment(
        UploadedFile|string $file,
        BriFundPosting $posting,
        User $actor
    ): string {
        if (is_string($file)) {
            Attachment::create([
                'store_id' => $posting->store_id,
                'entity_type' => 'BriFundPosting',
                'entity_id' => $posting->id,
                'category' => 'PROOF_ATTACHMENT',
                'file_name' => basename($file),
                'file_path' => $file,
                'file_size_bytes' => 0,
                'mime_type' => 'image/webp',
                'uploaded_by_id' => $actor->id,
                'created_at' => now(),
            ]);

            return $file;
        }

        $path = $file->store('bri-postings', 'public');
        $url = Storage::url($path);

        Attachment::create([
            'store_id' => $posting->store_id,
            'entity_type' => 'BriFundPosting',
            'entity_id' => $posting->id,
            'category' => 'PROOF_ATTACHMENT',
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $url,
            'file_size_bytes' => $file->getSize() ?: 0,
            'mime_type' => $file->getMimeType() ?: 'image/webp',
            'uploaded_by_id' => $actor->id,
            'created_at' => now(),
        ]);

        return $url;
    }
}
