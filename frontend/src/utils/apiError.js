/**
 * Laravel + axios: surfaces validation errors and non-JSON failures.
 */
export function apiErrorMessage(err, fallback = 'Request failed') {
  if (!err?.response) {
    if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
      return 'Cannot reach API — check VITE_API_URL, CORS, and that the backend is running.';
    }
    return err?.message || fallback;
  }

  const { data, status } = err.response;

  if (typeof data === 'string') {
    const t = data.replace(/<[^>]+>/g, '').trim();
    return t.slice(0, 240) || `Server error (${status})`;
  }

  if (data?.errors && typeof data.errors === 'object') {
    const msgs = Object.values(data.errors).flat().filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }

  if (data?.message) return data.message;

  return status ? `${fallback} (${status})` : fallback;
}
