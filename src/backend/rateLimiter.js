/**
 * Sunflower Preschool - In-Memory Rate Limiter
 *
 * Protects form submission endpoints against automated floods and abuse.
 * Provides configurable windows and limits, along with test reset mechanisms.
 */

class RateLimiter {
  constructor(options = {}) {
    // Default: 20 submissions per 15 minutes per IP
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.maxSubmissions = options.maxSubmissions || 20;
    // Default: 120 API requests per minute per IP
    this.apiWindowMs = options.apiWindowMs || 60 * 1000;
    this.maxApiRequests = options.maxApiRequests || 120;

    this.submissionHits = new Map();
    this.apiHits = new Map();

    // Periodic cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref(); // Don't hold Node process open
    }
  }

  /**
   * Checks if an IP is within the allowed submission rate limit.
   * @param {string} ip
   * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
   */
  checkSubmissionLimit(ip) {
    const now = Date.now();
    const cleanIp = (ip || '127.0.0.1').trim();
    let record = this.submissionHits.get(cleanIp);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + this.windowMs };
      this.submissionHits.set(cleanIp, record);
    }

    if (record.count >= this.maxSubmissions) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxSubmissions - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Checks if an IP is within general API request limits.
   * @param {string} ip
   * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
   */
  checkApiLimit(ip) {
    const now = Date.now();
    const cleanIp = (ip || '127.0.0.1').trim();
    let record = this.apiHits.get(cleanIp);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + this.apiWindowMs };
      this.apiHits.set(cleanIp, record);
    }

    if (record.count >= this.maxApiRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxApiRequests - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Resets rate limit records for a given IP (useful for QA tests).
   */
  resetRateLimit(ip) {
    const cleanIp = (ip || '127.0.0.1').trim();
    this.submissionHits.delete(cleanIp);
    this.apiHits.delete(cleanIp);
  }

  /**
   * Resets all rate limit records.
   */
  resetAll() {
    this.submissionHits.clear();
    this.apiHits.clear();
  }

  /**
   * Purges expired entries to prevent memory growth.
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.submissionHits.entries()) {
      if (now > record.resetTime) {
        this.submissionHits.delete(ip);
      }
    }
    for (const [ip, record] of this.apiHits.entries()) {
      if (now > record.resetTime) {
        this.apiHits.delete(ip);
      }
    }
  }

  /**
   * Destroys timer (for clean test exits).
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Export singleton instance and class
const defaultLimiter = new RateLimiter();

module.exports = {
  RateLimiter,
  defaultLimiter
};
