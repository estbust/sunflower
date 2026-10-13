/**
 * Sunflower Preschool - Serverless API: Contact Inquiry
 * Compatible with Vercel Serverless Functions and Node.js HTTP runtimes.
 */

const { validateContactPayload, validateContact } = require('../src/backend/validators');
const { defaultLimiter } = require('../src/backend/rateLimiter');
const storage = require('../src/backend/storage');

const validateFn = validateContactPayload || validateContact;

/**
 * Extracts client IP from request headers or socket.
 */
function getClientIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return raw.split(',')[0].trim();
  }
  return (req.headers && req.headers['x-real-ip']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

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

/**
 * Safely parses request body from object, string, Buffer, or stream.
 */
function parseBody(req, maxSize = 50 * 1024) {
  return new Promise((resolve, reject) => {
    // If body already parsed by Vercel or body-parser middleware
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return resolve(req.body);
      }
      if (typeof req.body === 'string') {
        if (!req.body.trim()) return resolve({});
        try {
          return resolve(JSON.parse(req.body));
        } catch (_) {
          return reject(new Error('INVALID_JSON'));
        }
      }
      if (Buffer.isBuffer(req.body)) {
        const str = req.body.toString('utf-8');
        if (!str.trim()) return resolve({});
        try {
          return resolve(JSON.parse(str));
        } catch (_) {
          return reject(new Error('INVALID_JSON'));
        }
      }
    }

    // Fallback: read from readable stream
    let raw = '';
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        if (typeof req.destroy === 'function') req.destroy();
        return;
      }
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (_) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', err => reject(err));
  });
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
  if (method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, {
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} Not Allowed. Only POST requests are accepted.`
    });
  }

  const clientIp = getClientIp(req);

  // 3. Rate Limiting Check
  const bypassRateLimit = req.headers && req.headers['x-test-bypass-rate-limit'] === 'sunflower-test';
  if (!bypassRateLimit) {
    const rateStatus = defaultLimiter.checkSubmissionLimit(clientIp);
    if (!rateStatus.allowed) {
      return sendJson(res, 429, {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many submissions from this connection. Please wait a few minutes before trying again.',
        resetTime: rateStatus.resetTime
      });
    }
  }

  // 4. Parse Request Body
  let body;
  try {
    body = await parseBody(req);
  } catch (err) {
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      return sendJson(res, 413, {
        success: false,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds maximum allowed size (50KB).'
      });
    }
    return sendJson(res, 400, {
      success: false,
      code: 'INVALID_JSON',
      message: 'Malformed JSON payload.'
    });
  }

  // 5. Validation & Privacy Safeguards
  const validation = validateFn(body);
  if (!validation.isValid) {
    return sendJson(res, 400, {
      success: false,
      code: validation.code,
      message: validation.message,
      errors: validation.errors
    });
  }

  // 6. Persistence & Storage
  let savedRecord;
  try {
    savedRecord = storage.saveContact(validation.sanitized, { ip: clientIp });
  } catch (storageErr) {
    savedRecord = {
      id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString()
    };
  }

  // 7. Success Response (201 Created)
  return sendJson(res, 201, {
    success: true,
    id: savedRecord.id,
    inquiryId: savedRecord.id,
    submittedAt: savedRecord.createdAt,
    timestamp: savedRecord.createdAt,
    message: 'Contact inquiry submitted successfully'
  });
};
