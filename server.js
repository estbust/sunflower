/**
 * Sunflower Preschool - HTTP Web & API Server
 *
 * Zero-dependency native Node.js HTTP server.
 * Provides REST API endpoints and static file serving with clean directory route resolution.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { validateEnrollment, validateContact } = require('./src/backend/validators');
const { defaultLimiter } = require('./src/backend/rateLimiter');
const storage = require('./src/backend/storage');

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

/**
 * Extracts client IP from incoming request headers or socket.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Sends a standard JSON response.
 */
function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Test-Bypass-Rate-Limit'
  });
  res.end(payload);
}

/**
 * Safely parses JSON request body with a maximum size threshold (50KB).
 */
function parseJsonBody(req, maxSize = 50 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
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
      } catch (err) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', err => reject(err));
  });
}

/**
 * Resolves static file path within public directory, handling directory routes.
 */
function resolveStaticPath(reqPath) {
  let decodedPath = decodeURIComponent(reqPath);
  // Strip query string if any
  decodedPath = decodedPath.split('?')[0];

  // Resolve target absolute path
  let targetPath = path.resolve(PUBLIC_DIR, '.' + decodedPath);

  // Directory traversal defense: must stay strictly inside PUBLIC_DIR
  if (!targetPath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  // Check if direct file exists
  if (fs.existsSync(targetPath)) {
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      const indexHtml = path.join(targetPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return indexHtml;
      }
    } else {
      return targetPath;
    }
  }

  // Try appending .html (clean URL support: e.g. /about -> /about.html)
  const htmlPath = targetPath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return htmlPath;
  }

  // Try directory index.html if route without trailing slash (e.g. /programs -> /programs/index.html)
  const dirIndexPath = path.join(targetPath, 'index.html');
  if (fs.existsSync(dirIndexPath) && fs.statSync(dirIndexPath).isFile()) {
    return dirIndexPath;
  }

  return null;
}

/**
 * Handles static file serving.
 */
function serveStatic(req, res, pathname) {
  const filePath = resolveStaticPath(pathname);

  if (!filePath) {
    // 404 Not Found
    res.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end('<!DOCTYPE html><html><head><title>404 Not Found - Sunflower Preschool</title></head><body><h1>404 - Page Not Found</h1><p>The requested page could not be found. Return to <a href="/">Sunflower Preschool Home</a>.</p></body></html>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
}

/**
 * Core Request Handler
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const clientIp = getClientIp(req);

  // CORS preflight handling
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Test-Bypass-Rate-Limit'
    });
    res.end();
    return;
  }

  // =========================================================================
  // REST API Endpoints
  // =========================================================================

  // GET /api/health
  if (method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'Sunflower Preschool API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
    return;
  }

  // POST /api/enrollment
  if (method === 'POST' && pathname === '/api/enrollment') {
    // Rate Limit Check (unless bypassed by test header)
    const bypassRateLimit = req.headers['x-test-bypass-rate-limit'] === 'sunflower-test';
    if (!bypassRateLimit) {
      const rateStatus = defaultLimiter.checkSubmissionLimit(clientIp);
      if (!rateStatus.allowed) {
        sendJson(res, 429, {
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many submissions from this connection. Please wait a few minutes before trying again.',
          resetTime: rateStatus.resetTime
        });
        return;
      }
    }

    try {
      const body = await parseJsonBody(req);
      const validation = validateEnrollment(body);

      if (!validation.isValid) {
        const statusCode = validation.code === 'SPAM_DETECTED' ? 400 : 400;
        sendJson(res, statusCode, {
          success: false,
          code: validation.code,
          message: validation.message,
          errors: validation.errors
        });
        return;
      }

      // Persist valid inquiry
      const savedRecord = storage.saveEnrollment(validation.sanitized, { ip: clientIp });

      sendJson(res, 201, {
        success: true,
        id: savedRecord.id,
        inquiryId: savedRecord.id,
        submittedAt: savedRecord.createdAt,
        timestamp: savedRecord.createdAt,
        message: 'Enrollment inquiry submitted successfully'
      });
      return;
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(res, 413, {
          success: false,
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload exceeds maximum allowed size (50KB).'
        });
        return;
      }
      sendJson(res, 400, {
        success: false,
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload.'
      });
      return;
    }
  }

  // POST /api/contact
  if (method === 'POST' && pathname === '/api/contact') {
    // Rate Limit Check
    const bypassRateLimit = req.headers['x-test-bypass-rate-limit'] === 'sunflower-test';
    if (!bypassRateLimit) {
      const rateStatus = defaultLimiter.checkSubmissionLimit(clientIp);
      if (!rateStatus.allowed) {
        sendJson(res, 429, {
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many submissions from this connection. Please wait a few minutes before trying again.',
          resetTime: rateStatus.resetTime
        });
        return;
      }
    }

    try {
      const body = await parseJsonBody(req);
      const validation = validateContact(body);

      if (!validation.isValid) {
        const statusCode = validation.code === 'SPAM_DETECTED' ? 400 : 400;
        sendJson(res, statusCode, {
          success: false,
          code: validation.code,
          message: validation.message,
          errors: validation.errors
        });
        return;
      }

      // Persist valid inquiry
      const savedRecord = storage.saveContact(validation.sanitized, { ip: clientIp });

      sendJson(res, 201, {
        success: true,
        id: savedRecord.id,
        inquiryId: savedRecord.id,
        submittedAt: savedRecord.createdAt,
        timestamp: savedRecord.createdAt,
        message: 'Contact inquiry submitted successfully'
      });
      return;
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(res, 413, {
          success: false,
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload exceeds maximum allowed size (50KB).'
        });
        return;
      }
      sendJson(res, 400, {
        success: false,
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload.'
      });
      return;
    }
  }

  // Reject unknown /api routes with 404 JSON
  if (pathname.startsWith('/api/')) {
    sendJson(res, 404, {
      success: false,
      code: 'NOT_FOUND',
      message: `API endpoint '${pathname}' not found.`
    });
    return;
  }

  // =========================================================================
  // Static File Serving (Only GET and HEAD allowed)
  // =========================================================================
  if (method === 'GET' || method === 'HEAD') {
    serveStatic(req, res, pathname);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
}

/**
 * Creates the HTTP server instance.
 */
function createServer() {
  return http.createServer(handleRequest);
}

/**
 * Starts the server on a specified port.
 */
function startServer(port = DEFAULT_PORT) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`🌻 Sunflower Preschool server running on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

// If run directly via `node server.js`
if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = {
  createServer,
  startServer,
  handleRequest,
  PUBLIC_DIR
};
