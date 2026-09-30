<?php

namespace App\Actions\Voucher;

use App\Actions\Notification\SendNotificationAction;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\PettyCashVoucher;
use App\Models\Store;
use App\Models\StoreOpnameConfig;
use App\Models\User;
use App\Services\DocumentNumberGenerator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class CreateVoucherAction
{
    public function __construct(
        protected DocumentNumberGenerator $numberGenerator,
        protected SendNotificationAction $notificationAction
    ) {}

    /**
     * Create a new petty cash voucher (DRAFT or SUBMITTED).
     *
     * @param  array{
     *     amount_cents: int,
     *     purpose: string,
     *     category: string,
     *     receipt_image?: UploadedFile|string|null,
     *     item_photo?: UploadedFile|string|null,
     *     is_submit?: bool
     * }  $data
     */
    public function execute(array $data, User $actor, ?string $ipAddress = null): PettyCashVoucher
    {
        if ($data['amount_cents'] <= 0) {
            throw new InvalidArgumentException('Nominal voucher harus lebih besar dari 0.');
        }

        $store = Store::findOrFail($actor->store_id);

        // Check imprest fund ceiling if config exists
        $opnameConfig = StoreOpnameConfig::where('store_id', $store->id)
            ->where('opname_type', 'KAS_KECIL')
            ->first();

        if ($opnameConfig && $data['amount_cents'] > $opnameConfig->imprest_fund_cents) {
            throw new InvalidArgumentException('Nominal voucher melebihi batas dana kas kecil.');
        }

        $isSubmit = (bool) ($data['is_submit'] ?? false);

        return DB::transaction(function () use ($data, $actor, $store, $isSubmit, $ipAddress) {
            $voucherNumber = $this->numberGenerator->generateVoucherNumber($store);

            $receiptImageUrl = null;
            $itemPhotoUrl = null;

            $status = $isSubmit ? PettyCashVoucher::STATUS_SUBMITTED : PettyCashVoucher::STATUS_DRAFT;

            $voucher = PettyCashVoucher::create([
                'store_id' => $store->id,
                'voucher_number' => $voucherNumber,
                'requester_id' => $actor->id,
                'amount_cents' => $data['amount_cents'],
                'purpose' => $data['purpose'],
                'category' => $data['category'],
                'status' => $status,
                'receipt_image_url' => null,
                'item_photo_url' => null,
            ]);

            // Handle receipt image upload / string
            if (! empty($data['receipt_image'])) {
                $receiptImageUrl = $this->storeAttachment(
                    $data['receipt_image'],
                    $voucher,
                    'RECEIPT_PHOTO',
                    $actor
                );
                $voucher->update(['receipt_image_url' => $receiptImageUrl]);
            }

            // Handle item photo upload / string
            if (! empty($data['item_photo'])) {
                $itemPhotoUrl = $this->storeAttachment(
                    $data['item_photo'],
                    $voucher,
                    'ITEM_PHOTO',
                    $actor
                );
                $voucher->update(['item_photo_url' => $itemPhotoUrl]);
            }

            // If submitting, receipt image is mandatory
            if ($isSubmit && empty($voucher->receipt_image_url)) {
                throw new InvalidArgumentException('Foto kuitansi/bukti wajib dilampirkan sebelum pengajuan.');
            }

            // Audit log
            AuditLog::create([
                'store_id' => $store->id,
                'entity_name' => 'PettyCashVoucher',
                'entity_id' => $voucher->id,
                'action' => $isSubmit ? 'SUBMIT_VOUCHER' : 'CREATE_VOUCHER',
                'performed_by_id' => $actor->id,
                'old_values' => null,
                'new_values' => [
                    'voucher_number' => $voucher->voucher_number,
                    'amount_cents' => $voucher->amount_cents,
                    'purpose' => $voucher->purpose,
                    'category' => $voucher->category,
                    'status' => $voucher->status,
                ],
                'ip_address' => $ipAddress,
            ]);

            // Notify SS and SAC if submitted
            if ($isSubmit) {
                $this->notificationAction->toStoreRoles(
                    $store->id,
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
        UploadedFile|string $file,
        PettyCashVoucher $voucher,
        string $category,
        User $actor
    ): string {
        if (is_string($file)) {
            // Already uploaded path
            Attachment::create([
                'store_id' => $voucher->store_id,
                'entity_type' => 'VOUCHER',
                'entity_id' => $voucher->id,
                'category' => $category,
                'file_name' => basename($file),
                'file_path' => $file,
                'file_size_bytes' => 0,
                'mime_type' => 'image/webp',
                'uploaded_by_id' => $actor->id,
                'created_at' => now(),
            ]);

            return $file;
        }

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
            'mime_type' => $file->getMimeType() ?: 'image/webp',
            'uploaded_by_id' => $actor->id,
            'created_at' => now(),
        ]);

        return $url;
    }
}
