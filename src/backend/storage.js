/**
 * Sunflower Preschool - Persistence & Storage Module
 *
 * Persists sanitized inquiries to src/backend/data/submissions.json.
 * Guarantees zero sensitive data retention by performing an integrity check before disk write.
 */

const fs = require('fs');
const path = require('path');
const { detectSensitiveData } = require('./validators');

const DATA_DIR = path.join(__dirname, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

/**
 * Ensures data directory and submissions file exist with proper initial structure.
 */
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    const initial = { enrollments: [], contacts: [] };
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

/**
 * Reads all submissions from JSON storage.
 * @returns {{ enrollments: Array, contacts: Array }}
 */
function readData() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      enrollments: Array.isArray(parsed.enrollments) ? parsed.enrollments : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
    };
  } catch (err) {
    console.error('Warning: Failed to read submissions.json, initializing fresh state:', err.message);
    const initial = { enrollments: [], contacts: [] };
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

/**
 * Writes data object to submissions file atomically.
 * @param {{ enrollments: Array, contacts: Array }} data
 */
function writeData(data) {
  ensureStorage();
  const tempPath = `${SUBMISSIONS_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, SUBMISSIONS_FILE);
}

/**
 * Anonymizes client IP address to preserve privacy.
 * @param {string} ip
 * @returns {string}
 */
function maskIp(ip) {
  if (!ip) return 'unknown';
  if (ip === '127.0.0.1' || ip === '::1') return 'localhost';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip.substring(0, 8) + '...';
}

/**
 * Saves a sanitized Enrollment inquiry.
 * @param {Object} sanitizedPayload
 * @param {Object} [meta]
 * @returns {Object} Stored record
 */
function saveEnrollment(sanitizedPayload, meta = {}) {
  // Defensive integrity check: ensure no sensitive data leaked into sanitized payload
  const check = detectSensitiveData(sanitizedPayload);
  if (check.hasSensitiveData) {
    throw new Error('Security Error: Attempted to store sensitive data in enrollment record.');
  }

  const data = readData();
  const recordId = `enr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record = {
    id: recordId,
    type: 'enrollment',
    parentName: sanitizedPayload.parentName,
    email: sanitizedPayload.email,
    phone: sanitizedPayload.phone,
    childFirstName: sanitizedPayload.childFirstName,
    program: sanitizedPayload.program,
    childAgeGroup: sanitizedPayload.childAgeGroup,
    preferredStart: sanitizedPayload.preferredStart || null,
    schedulePreference: sanitizedPayload.schedulePreference || null,
    message: sanitizedPayload.message || '',
    privacyConsent: true,
    status: 'received',
    createdAt: new Date().toISOString(),
    clientIp: maskIp(meta.ip)
  };

  data.enrollments.push(record);
  writeData(data);
  return record;
}

/**
 * Saves a sanitized Contact inquiry.
 * @param {Object} sanitizedPayload
 * @param {Object} [meta]
 * @returns {Object} Stored record
 */
function saveContact(sanitizedPayload, meta = {}) {
  // Defensive integrity check: ensure no sensitive data leaked into sanitized payload
  const check = detectSensitiveData(sanitizedPayload);
  if (check.hasSensitiveData) {
    throw new Error('Security Error: Attempted to store sensitive data in contact record.');
  }

  const data = readData();
  const recordId = `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record = {
    id: recordId,
    type: 'contact',
    name: sanitizedPayload.name,
    email: sanitizedPayload.email,
    phone: sanitizedPayload.phone || null,
    topic: sanitizedPayload.topic,
    message: sanitizedPayload.message,
    privacyConsent: true,
    status: 'received',
    createdAt: new Date().toISOString(),
    clientIp: maskIp(meta.ip)
  };

  data.contacts.push(record);
  writeData(data);
  return record;
}

/**
 * Returns all saved records.
 */
function getAllSubmissions() {
  return readData();
}

/**
 * Clears submissions (used for test isolation).
 */
function clearSubmissions() {
  writeData({ enrollments: [], contacts: [] });
}

module.exports = {
  saveEnrollment,
  saveContact,
  getAllSubmissions,
  clearSubmissions,
  SUBMISSIONS_FILE
};
