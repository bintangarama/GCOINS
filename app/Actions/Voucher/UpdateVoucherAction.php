<?php

namespace App\Actions\Voucher;

use App\Actions\Notification\SendNotificationAction;
use App\Exceptions\InvalidVoucherStateException;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class UpdateVoucherAction
{
    public function __construct(
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Update an existing DRAFT petty cash voucher (and optionally submit it).
     *
     * @param  array{
     *     amount_cents: int,
     *     receipt_date?: string|null,
     *     purpose: string,
     *     category: string,
     *     receipt_image?: UploadedFile|null,
     *     item_photo?: UploadedFile|null,
     *     remove_receipt_image?: bool,
     *     remove_item_photo?: bool,
     *     is_submit?: bool
     * }  $data
     */
    public function execute(
        PettyCashVoucher $voucher,
        array $data,
        User $actor,
        ?string $ipAddress = null
    ): PettyCashVoucher {
        if (! Auth::check()) {
            Auth::setUser($actor);
        }

        if ($voucher->status !== PettyCashVoucher::STATUS_DRAFT) {
            throw new InvalidVoucherStateException("Hanya voucher berstatus DRAFT yang dapat diedit (status saat ini: {$voucher->status}).");
        }

        if ($voucher->requester_id !== $actor->id || $voucher->store_id !== $actor->store_id) {
            throw new AuthorizationException('Hanya pembuat draft yang dapat mengubah voucher ini.');
        }

        if ($data['amount_cents'] <= 0) {
            throw new InvalidArgumentException('Nominal voucher harus lebih besar dari 0.');
        }

        $opnameConfig = StoreOpnameConfig::where('store_id', $voucher->store_id)
            ->where('opname_type', 'KAS_KECIL')
            ->first();

        if ($opnameConfig && $data['amount_cents'] > $opnameConfig->imprest_fund_cents) {
            throw new InvalidArgumentException('Nominal voucher melebihi batas dana kas kecil.');
        }

        $isSubmit = (bool) ($data['is_submit'] ?? false);
        $receiptDate = ! empty($data['receipt_date'])
            ? $data['receipt_date']
            : ($voucher->receipt_date?->toDateString() ?? now()->toDateString());

        return DB::transaction(function () use ($voucher, $data, $actor, $isSubmit, $receiptDate, $ipAddress) {
            $oldValues = [
                'amount_cents' => $voucher->amount_cents,
                'receipt_date' => $voucher->receipt_date?->toDateString(),
                'purpose' => $voucher->purpose,
                'category' => $voucher->category,
                'status' => $voucher->status,
                'receipt_image_url' => $voucher->getRawOriginal('receipt_image_url'),
                'item_photo_url' => $voucher->getRawOriginal('item_photo_url'),
            ];

            $receiptImageUrl = $voucher->getRawOriginal('receipt_image_url');
            if (! empty($data['receipt_image'])) {
                if (! $data['receipt_image'] instanceof UploadedFile) {
                    throw ValidationException::withMessages([
                        'receipt_image' => 'Lampiran kuitansi harus berupa berkas unggahan yang valid.',
                    ]);
                }

                $receiptImageUrl = $this->storeAttachment(
                    $data['receipt_image'],
                    $voucher,
                    'RECEIPT_PHOTO',
                    $actor
                );
            } elseif (! empty($data['remove_receipt_image'])) {
                $receiptImageUrl = null;
            }

            $itemPhotoUrl = $voucher->getRawOriginal('item_photo_url');
            if (! empty($data['item_photo'])) {
                if (! $data['item_photo'] instanceof UploadedFile) {
                    throw ValidationException::withMessages([
                        'item_photo' => 'Lampiran foto barang harus berupa berkas unggahan yang valid.',
                    ]);
                }

                $itemPhotoUrl = $this->storeAttachment(
                    $data['item_photo'],
                    $voucher,
                    'ITEM_PHOTO',
                    $actor
                );
            } elseif (! empty($data['remove_item_photo'])) {
                $itemPhotoUrl = null;
            }

            // Rule 15: Mandatory receipt evidence when submitting
            if ($isSubmit && empty($receiptImageUrl)) {
                throw ValidationException::withMessages([
                    'receipt_image' => 'Foto kuitansi/bukti wajib dilampirkan sebelum pengajuan.',
                ]);
            }

            $newStatus = $isSubmit
                ? PettyCashVoucher::STATUS_SUBMITTED
                : PettyCashVoucher::STATUS_DRAFT;

            $voucher->update([
                'amount_cents' => $data['amount_cents'],
                'receipt_date' => $receiptDate,
                'purpose' => $data['purpose'],
                'category' => $data['category'],
                'status' => $newStatus,
                'receipt_image_url' => $receiptImageUrl,
                'item_photo_url' => $itemPhotoUrl,
            ]);

            AuditLog::create([
                'store_id' => $voucher->store_id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => $isSubmit ? 'SUBMIT_VOUCHER' : 'UPDATE_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'amount_cents' => $voucher->amount_cents,
                    'receipt_date' => $voucher->receipt_date?->toDateString(),
                    'purpose' => $voucher->purpose,
                    'category' => $voucher->category,
                    'status' => $voucher->status,
                    'receipt_image_url' => $receiptImageUrl,
                    'item_photo_url' => $itemPhotoUrl,
                ],
                'ip_address' => $ipAddress,
            ]);

            if ($isSubmit) {
                $this->notificationAction->toStoreRoles(
                    $voucher->store_id,
                    ['SS', 'SAC'],
                    'VOUCHER_SUBMITTED',
                    'Pengajuan Voucher Baru',
                    "Voucher {$voucher->voucher_number} sebesar Rp ".number_format($voucher->amount_cents / 100, 0, ',', '.')." diajukan oleh {$actor->name}.",
                    'VOUCHER',
                    $voucher->id,
                    $actor->id
                );
            }

            return $voucher;
        });
    }

    protected function storeAttachment(
        UploadedFile $file,
        PettyCashVoucher $voucher,
        string $category,
        User $actor
    ): string {
        $path = $file->store('vouchers', 'public');
        $url = Storage::url($path);

        Attachment::create([
            'store_id' => $voucher->store_id,
            'entity_type' => 'VOUCHER',
            'entity_id' => $voucher->id,
            'category' => $category,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $url,
            'file_size_bytes' => $file->getSize() ?: 0,
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'uploaded_by_id' => $actor->id,
            'created_at' => now(),
        ]);

        return $url;
    }
}
