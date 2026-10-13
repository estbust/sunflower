/**
 * Sunflower Preschool - Serverless API: Health Check
 * Compatible with Vercel Serverless Functions and Node.js HTTP runtimes.
 */

/**
 * Sends a standardized JSON response supporting both Vercel and native Node HTTP.
 */
function sendJson(res, statusCode, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Test-Bypass-Rate-Limit');

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }

  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

module.exports = async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

  // 1. CORS Preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Test-Bypass-Rate-Limit');
    if (typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.writeHead(204);
    return res.end();
  }

  // 2. HTTP Method Check
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendJson(res, 405, {
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} Not Allowed. Only GET requests are accepted.`
    });
  }

  // 3. Health status response
  return sendJson(res, 200, {
    status: 'ok',
    service: 'Sunflower Preschool API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
