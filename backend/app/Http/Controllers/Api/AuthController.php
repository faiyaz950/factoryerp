<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Rate limiting - 5 attempts per minute
        $key = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            LoginLog::recordLogin($request->email, false, null, 'Rate limited');
            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 60);
            LoginLog::recordLogin($request->email, false, $user?->id, 'Invalid credentials');
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if (!$user->is_active) {
            LoginLog::recordLogin($request->email, false, $user->id, 'Account deactivated');
            return response()->json(['message' => 'Account is deactivated. Contact admin.'], 403);
        }

        RateLimiter::clear($key);

        // Generate 2FA code
        $code = $user->generateTwoFactorCode();

        // In production, send via email. For now, log it.
        // Mail::raw("Your OTP code is: {$code}", function ($msg) use ($user) {
        //     $msg->to($user->email)->subject('FactoryERP - Login OTP');
        // });

        // Create token
        $token = $user->createToken('auth-token', ['*'], now()->addHours(8))->plainTextToken;

        // Update login info
        $user->update([
            'last_login_ip' => $request->ip(),
            'last_login_device' => $request->userAgent(),
            'last_login_at' => now(),
        ]);

        LoginLog::recordLogin($request->email, true, $user->id);
        ActivityLog::log('login');

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'requires_2fa' => true,
            'otp_code' => $code, // Remove in production - only for dev testing
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
            ],
        ]);
    }

    public function verify2FA(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (!$user->two_factor_code || $user->two_factor_expires_at < now()) {
            return response()->json(['message' => 'OTP has expired. Please login again.'], 401);
        }

        if ($user->two_factor_code !== $request->code) {
            return response()->json(['message' => 'Invalid OTP code.'], 401);
        }

        $user->resetTwoFactorCode();

        return response()->json([
            'message' => '2FA verified successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'two_factor_verified' => true,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        ActivityLog::log('logout');
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function logoutAll(Request $request)
    {
        ActivityLog::log('logout_all_devices');
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out from all devices.']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'role' => $request->user()->role,
                'phone' => $request->user()->phone,
                'two_factor_verified' => $request->user()->two_factor_verified,
                'last_login_at' => $request->user()->last_login_at,
            ],
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        if (!Hash::check($request->current_password, $request->user()->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $request->user()->update(['password' => $request->password]);
        ActivityLog::log('password_changed');

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);

        $user = User::where('email', $request->email)->first();
        $code = $user->generateTwoFactorCode();

        return response()->json([
            'message' => 'Password reset OTP sent to your email.',
            'otp_code' => $code, // Remove in production
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'code' => 'required|string|size:6',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user->two_factor_code || $user->two_factor_expires_at < now()) {
            return response()->json(['message' => 'OTP has expired.'], 401);
        }

        if ($user->two_factor_code !== $request->code) {
            return response()->json(['message' => 'Invalid OTP.'], 401);
        }

        $user->update(['password' => $request->password]);
        $user->resetTwoFactorCode();
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully. Please login.']);
    }

    // Admin: manage users
    public function users(Request $request)
    {
        $users = User::select('id', 'name', 'email', 'role', 'phone', 'is_active', 'last_login_at', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        return response()->json($users);
    }

    public function createUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => ['required', Password::min(8)->mixedCase()->numbers()],
            'role' => 'required|in:admin,supervisor',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $request->role,
            'phone' => $request->phone,
        ]);

        ActivityLog::log('user_created', 'User', $user->id);

        return response()->json(['message' => 'User created.', 'user' => $user], 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,supervisor',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $user->update($request->only(['name', 'email', 'role', 'phone', 'is_active']));
        ActivityLog::log('user_updated', 'User', $user->id);

        return response()->json(['message' => 'User updated.', 'user' => $user]);
    }

    public function forceLogout(User $user)
    {
        $user->tokens()->delete();
        ActivityLog::log('force_logout_user', 'User', $user->id);
        return response()->json(['message' => "User {$user->name} logged out from all devices."]);
    }
}
