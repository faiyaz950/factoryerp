<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    protected $fillable = [
        'user_id', 'email', 'ip_address', 'user_agent',
        'device_info', 'successful', 'failure_reason', 'is_suspicious',
    ];

    protected function casts(): array
    {
        return [
            'successful' => 'boolean',
            'is_suspicious' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function recordLogin(string $email, bool $success, ?int $userId = null, ?string $reason = null): self
    {
        $ip = request()->ip();
        $ua = request()->userAgent();

        // Check for suspicious activity - multiple failed attempts from same IP
        $recentFailed = self::where('ip_address', $ip)
            ->where('successful', false)
            ->where('created_at', '>=', now()->subMinutes(30))
            ->count();

        return self::create([
            'user_id' => $userId,
            'email' => $email,
            'ip_address' => $ip,
            'user_agent' => $ua,
            'device_info' => self::parseDevice($ua),
            'successful' => $success,
            'failure_reason' => $reason,
            'is_suspicious' => $recentFailed >= 5,
        ]);
    }

    private static function parseDevice(?string $ua): string
    {
        if (!$ua) return 'Unknown';
        if (str_contains($ua, 'Mobile')) return 'Mobile';
        if (str_contains($ua, 'Tablet')) return 'Tablet';
        return 'Desktop';
    }
}
