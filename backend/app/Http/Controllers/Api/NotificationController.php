<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ActivityLog;
use App\Models\LoginLog;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Notification::where('user_id', $request->user()->id)
                ->orderBy('created_at', 'desc')
                ->paginate(20)
        );
    }

    public function markRead(Notification $notification)
    {
        $notification->update(['is_read' => true]);
        return response()->json(['message' => 'Marked as read.']);
    }

    public function markAllRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)->unread()->update(['is_read' => true]);
        return response()->json(['message' => 'All marked as read.']);
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)->unread()->count();
        return response()->json(['count' => $count]);
    }

    // Activity logs (admin only)
    public function activityLogs(Request $request)
    {
        $query = ActivityLog::with('user:id,name');
        if ($request->filled('user_id')) $query->where('user_id', $request->user_id);
        if ($request->filled('action')) $query->where('action', 'like', "%{$request->action}%");

        return response()->json($query->orderBy('created_at', 'desc')->paginate(30));
    }

    // Login logs (admin only)
    public function loginLogs(Request $request)
    {
        $query = LoginLog::with('user:id,name,email');
        if ($request->boolean('suspicious_only')) $query->where('is_suspicious', true);
        if ($request->boolean('failed_only')) $query->where('successful', false);

        return response()->json($query->orderBy('created_at', 'desc')->paginate(30));
    }
}
