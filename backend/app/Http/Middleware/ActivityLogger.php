<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;

class ActivityLogger
{
    public function handle(Request $request, Closure $next): mixed
    {
        $response = $next($request);

        if ($request->user() && in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $action = match ($request->method()) {
                'POST' => 'created',
                'PUT', 'PATCH' => 'updated',
                'DELETE' => 'deleted',
                default => 'accessed',
            };

            $routeName = $request->route()?->getName() ?? $request->path();

            ActivityLog::log(
                action: "{$action} via {$routeName}",
                modelType: null,
                modelId: null,
                old: null,
                new: $request->except(['password', 'password_confirmation', '_token'])
            );
        }

        return $response;
    }
}
