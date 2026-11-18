/**
 * Sunflower Preschool - Cloudflare Turnstile Siteverify Backend Module
 *
 * Implements server-side token verification against Cloudflare's Turnstile siteverify API.
 * Follows the official canonical "gate, don't replace" verification pattern:
 * https://developers.cloudflare.com/turnstile/spin/prompt.md
 *
 * Strict security rules:
 *  - Fail-closed: Missing secrets, empty allowed hostnames, or invalid tokens result in HTTP 403.
 *  - Enforces secret from process.env.TURNSTILE_SECRET.
 *  - Enforces hostname allowlist from process.env.TURNSTILE_HOSTNAMES.
 *  - Checks action match if expectedAction is supplied.
 *  - Never hardcodes secrets.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Checks whether Turnstile verification is actively enforced in the environment.
 * @returns {boolean}
 */
function isTurnstileEnforced() {
  return Boolean(process.env.TURNSTILE_SECRET && process.env.TURNSTILE_SECRET.trim());
}

/**
 * Extracts a Turnstile token from request payload.
 * Checks payload['cf-turnstile-response'], payload.turnstileResponse, payload.turnstile_token in priority order.
 * @param {Object} payload
 * @returns {string} Trimmed token string or empty string
 */
function extractTurnstileToken(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const candidate =
    payload['cf-turnstile-response'] !== undefined
      ? payload['cf-turnstile-response']
      : payload.turnstileResponse !== undefined
      ? payload.turnstileResponse
      : payload.turnstile_token !== undefined
      ? payload.turnstile_token
      : '';

  return typeof candidate === 'string' ? candidate.trim() : '';
}

/**
 * Verifies a Turnstile response token with Cloudflare siteverify endpoint.
 *
 * @param {Object} options
 * @param {string} options.token - Cloudflare Turnstile token from client
 * @param {string} [options.remoteip] - Client IP address
 * @param {string} [options.expectedAction] - Expected action string ('enrollment' or 'contact')
 * @param {string} [options.secret] - Optional override for process.env.TURNSTILE_SECRET
 * @param {string|string[]|Set<string>} [options.allowedHostnames] - Optional override for hostnames allowlist
 * @param {Function} [options.fetchImpl] - Optional custom fetch function for testing
 * @returns {Promise<{ ok: boolean, status?: number, code?: string, message?: string, result?: Object }>}
 */
async function verifyTurnstileToken({
  token,
  remoteip,
  expectedAction,
  secret,
  allowedHostnames,
  fetchImpl
} = {}) {
  const secretKey = secret !== undefined ? secret : process.env.TURNSTILE_SECRET;

  const rawHostnames =
    allowedHostnames !== undefined ? allowedHostnames : (process.env.TURNSTILE_HOSTNAMES || '');

  let hostnamesList = [];
  if (rawHostnames instanceof Set) {
    hostnamesList = Array.from(rawHostnames);
  } else if (Array.isArray(rawHostnames)) {
    hostnamesList = rawHostnames;
  } else if (typeof rawHostnames === 'string') {
    hostnamesList = rawHostnames.split(',');
  }

  const expectedHostnames = new Set(
    hostnamesList.map(h => (typeof h === 'string' ? h.trim() : '')).filter(Boolean)
  );

  // Fail-closed validation checks (HTTP 403)
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  if (!secretKey || typeof secretKey !== 'string' || !secretKey.trim()) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  if (expectedHostnames.size === 0) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  const params = new URLSearchParams({
    secret: secretKey.trim(),
    response: token,
    ...(remoteip ? { remoteip: String(remoteip).trim() } : {})
  });

  let response;
  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(10_000)
        : undefined;

    const requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    };
    if (signal) {
      requestInit.signal = signal;
    }

    response = await fetchFn(SITEVERIFY_URL, requestInit);
  } catch (err) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  if (!response || !response.ok) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  let result;
  try {
    result = await response.json();
  } catch (err) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  // Strict outcome checks
  if (!result || result.success !== true) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  if (expectedAction && result.action !== expectedAction) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  if (!expectedHostnames.has(result.hostname)) {
    return {
      ok: false,
      status: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Security verification failed. Please complete the challenge and try again.'
    };
  }

  return {
    ok: true,
    result
  };
}

module.exports = {
  SITEVERIFY_URL,
  isTurnstileEnforced,
  extractTurnstileToken,
  verifyTurnstileToken
};
