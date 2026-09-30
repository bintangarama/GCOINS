<?php

namespace App\Http\Controllers;

use App\Actions\Notification\MarkAllNotificationsAsReadAction;
use App\Actions\Notification\MarkNotificationAsReadAction;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Display a listing of user notifications.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filter = $request->input('filter', 'all');

        $query = Notification::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->latest('created_at');

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->paginate(20)->withQueryString();

        $unreadCount = Notification::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return Inertia::render('Notification/Index', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'filters' => [
                'filter' => $filter,
            ],
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(
        Notification $notification,
        Request $request,
        MarkNotificationAsReadAction $action
    ): RedirectResponse {
        $action->execute($notification, $request->user());

        return back()->with('success', __('Notifikasi ditandai sebagai sudah dibaca.'));
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(
        Request $request,
        MarkAllNotificationsAsReadAction $action
    ): RedirectResponse {
        $count = $action->execute($request->user());

        return back()->with('success', __(':count notifikasi ditandai sebagai sudah dibaca.', ['count' => $count]));
    }

    /**
     * Delete a notification.
     */
    public function destroy(Notification $notification, Request $request): RedirectResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403, __('Anda tidak berhak menghapus notifikasi ini.'));
        }

        $notification->delete();

        return back()->with('success', __('Notifikasi berhasil dihapus.'));
    }
}
