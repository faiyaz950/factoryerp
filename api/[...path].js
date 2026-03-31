/**
 * Proxies /api/* to your deployed Laravel API (same-origin from the browser → no CORS on client).
 * Vercel → Settings → Environment Variables (server):
 *   LARAVEL_API_URL = https://your-laravel-host.com/api   (no trailing slash after /api, or include path as needed)
 */
module.exports = async (req, res) => {
  const base = process.env.LARAVEL_API_URL;
  if (!base) {
    res.status(500).json({
      message:
        'Set LARAVEL_API_URL in Vercel Environment Variables to your Laravel API base URL (e.g. https://api.example.com/api), then redeploy.',
    });
    return;
  }

  const baseUrl = base.replace(/\/$/, '');
  const u = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const afterApi = u.pathname.replace(/^\/api/, '') || '/';
  const target = `${baseUrl}${afterApi}${u.search}`;

  const hopByHop = new Set([
    'connection',
    'host',
    'content-length',
    'transfer-encoding',
    'keep-alive',
  ]);
  const fwd = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (hopByHop.has(k.toLowerCase())) continue;
    if (typeof v === 'string') fwd[k] = v;
    else if (Array.isArray(v)) fwd[k] = v.join(', ');
  }

  const init = {
    method: req.method,
    headers: fwd,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await readBody(req);
    if (body.length) init.body = body;
  }

  try {
    const r = await fetch(target, init);
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(r.status);
    r.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === 'transfer-encoding' || lk === 'connection') return;
      res.setHeader(key, value);
    });
    res.send(buf);
  } catch (e) {
    console.error('[api proxy]', e);
    res.status(502).json({
      message: 'Cannot reach Laravel API. Check LARAVEL_API_URL and that the server is up.',
      detail: String(e?.message || e),
    });
  }
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
