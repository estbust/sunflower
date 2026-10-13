/**
 * Sunflower Preschool - Automated Backend Test Suite
 *
 * Runs comprehensive unit and integration tests verifying:
 *  - Form schema validation and error reporting
 *  - Sensitive data detection & rejection (Medical details, Full birthdates, PII)
 *  - Honeypot and link spam prevention
 *  - Strict field allowlist enforcement
 *  - Persistence storage integrity
 *  - Rate limiter behavior
 *  - Live HTTP endpoints (/api/health, /api/enrollment, /api/contact)
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const { validateEnrollment, validateContact } = require('./validators');
const { RateLimiter } = require('./rateLimiter');
const storage = require('./storage');
const { startServer } = require('../../server');

const TEST_PORT = 3456;
let passedCount = 0;
let failedCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

async function asyncTest(description, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

function makeHttpRequest({ path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method,
        headers: reqHeaders
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(raw);
          } catch (_) {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('🧪 RUNNING SUNFLOWER PRESCHOOL BACKEND TESTS');
  console.log('='.repeat(70));

  // =========================================================================
  // 1. UNIT TESTS: ENROLLMENT FORM VALIDATION
  // =========================================================================
  console.log('\n[Suite 1] Enrollment Form Validation & Sensitive Data Rejection');

  const validEnrollment = {
    parentName: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '(555) 234-5678',
    childFirstName: 'Mia',
    program: 'preschool',
    childAgeGroup: '3-5-years',
    preferredStart: 'Fall 2026',
    schedulePreference: 'full-time',
    message: 'We are looking forward to touring the facility and meeting teachers.',
    privacyConsent: true
  };

  test('Valid enrollment inquiry succeeds', () => {
    const res = validateEnrollment(validEnrollment);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.sanitized.childFirstName, 'Mia');
    assert.strictEqual(res.sanitized.program, 'preschool');
  });

  test('Rejects medical details in forbidden field (allergies)', () => {
    const payload = { ...validEnrollment, allergies: 'Peanut allergy' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
    assert.ok(res.errors.some(e => e.category === 'medical'));
  });

  test('Rejects medical keywords in message: peanut allergy', () => {
    const payload = { ...validEnrollment, message: 'Child has severe peanut allergy and carries an inhaler' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
    assert.ok(res.errors.some(e => e.field === 'message'));
  });

  test('Rejects medical keywords in message: asthma, diagnosis, medication, autism, IEP', () => {
    const keywords = [
      'needs daily asthma medication',
      'recent diagnosis of autism spectrum',
      'has an active IEP plan from previous daycare',
      'requires epipen on site',
      'recovering from surgery',
      'gluten and lactose intolerance symptoms'
    ];
    for (const kw of keywords) {
      const payload = { ...validEnrollment, message: kw };
      const res = validateEnrollment(payload);
      assert.strictEqual(res.isValid, false, `Failed to reject: ${kw}`);
      assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
    }
  });

  test('Rejects full calendar birthdate field (dob)', () => {
    const payload = { ...validEnrollment, dob: '2022-04-12' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
    assert.ok(res.errors.some(e => e.category === 'birthdate'));
  });

  test('Rejects full calendar birthdate in text: YYYY-MM-DD, MM/DD/YYYY, Written', () => {
    const dateExamples = [
      'Our daughter was born on 2021-05-14',
      'DOB is 05/14/2021',
      'Birthday: 5/14/21',
      'Born January 15, 2022 in Seattle',
      'Her date of birth is 15 Mar 2020'
    ];
    for (const ex of dateExamples) {
      const payload = { ...validEnrollment, message: ex };
      const res = validateEnrollment(payload);
      assert.strictEqual(res.isValid, false, `Failed to reject date: ${ex}`);
      assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
    }
  });

  test('Allows general timeframe (Fall 2026, Next Month, 2026-09) and age groups', () => {
    const allowed = [
      { preferredStart: 'Fall 2026' },
      { preferredStart: 'Next Month' },
      { preferredStart: '2026-09' },
      { preferredStart: 'Summer' }
    ];
    for (const item of allowed) {
      const payload = { ...validEnrollment, ...item };
      const res = validateEnrollment(payload);
      assert.strictEqual(res.isValid, true, `Wrongly rejected valid timeframe: ${item.preferredStart}`);
    }
  });

  test('Rejects sensitive PII (SSN, credit card, passport #)', () => {
    const piiExamples = [
      'SSN is 123-45-6789',
      'Card 4111 2222 3333 4444',
      'Passport #A12345678',
      "Driver's license #DL998877"
    ];
    for (const ex of piiExamples) {
      const payload = { ...validEnrollment, message: ex };
      const res = validateEnrollment(payload);
      assert.strictEqual(res.isValid, false, `Failed to reject PII: ${ex}`);
      assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
    }
  });

  test('Rejects honeypot spam submission', () => {
    const payload = { ...validEnrollment, website: 'http://spamsite.example.com' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SPAM_DETECTED');
  });

  test('Rejects multiple URL spam in message', () => {
    const payload = { ...validEnrollment, message: 'Check http://site1.com and https://site2.com for prizes' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SPAM_DETECTED');
  });

  test('Rejects unexpected field outside schema allowlist', () => {
    const payload = { ...validEnrollment, favoriteToy: 'Lego' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'UNEXPECTED_FIELD');
  });

  test('Rejects missing privacyConsent', () => {
    const payload = { ...validEnrollment, privacyConsent: false };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.ok(res.errors.some(e => e.field === 'privacyConsent'));
  });

  test('Rejects invalid email format', () => {
    const payload = { ...validEnrollment, email: 'not-an-email' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.ok(res.errors.some(e => e.field === 'email'));
  });

  test('Rejects invalid program enum', () => {
    const payload = { ...validEnrollment, program: 'college-prep' };
    const res = validateEnrollment(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.ok(res.errors.some(e => e.field === 'program'));
  });

  // =========================================================================
  // 2. UNIT TESTS: CONTACT FORM VALIDATION
  // =========================================================================
  console.log('\n[Suite 2] Contact Form Validation & Sensitive Data Rejection');

  const validContact = {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@example.com',
    phone: '555-987-6543',
    topic: 'schedule-tour',
    message: 'Hello! I would like to schedule an in-person tour next Tuesday morning.',
    privacyConsent: true
  };

  test('Valid contact inquiry succeeds', () => {
    const res = validateContact(validContact);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.sanitized.topic, 'schedule-tour');
  });

  test('Rejects contact message containing medical keywords', () => {
    const payload = { ...validContact, message: 'My son has epilepsy and takes medication' };
    const res = validateContact(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
  });

  test('Rejects contact message containing birthdate', () => {
    const payload = { ...validContact, message: 'Looking for a spot, child born on 2022-08-10' };
    const res = validateContact(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SENSITIVE_DATA_DETECTED');
  });

  test('Rejects contact message shorter than 10 characters', () => {
    const payload = { ...validContact, message: 'Hi' };
    const res = validateContact(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.ok(res.errors.some(e => e.field === 'message'));
  });

  test('Rejects honeypot in contact form', () => {
    const payload = { ...validContact, website: 'http://bot.com' };
    const res = validateContact(payload);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.code, 'SPAM_DETECTED');
  });

  // =========================================================================
  // 3. UNIT TESTS: PERSISTENCE STORAGE
  // =========================================================================
  console.log('\n[Suite 3] Storage & Persistence Layer');

  test('Persists enrollment inquiry cleanly and retrieves it', () => {
    const sanitized = {
      parentName: 'Test Parent',
      email: 'test.parent@example.com',
      phone: '555-000-1111',
      childFirstName: 'Leo',
      program: 'toddler-care',
      childAgeGroup: '18-36-months',
      preferredStart: 'Next Month',
      schedulePreference: 'part-time',
      message: 'Looking for 3 days a week.',
      privacyConsent: true
    };
    const saved = storage.saveEnrollment(sanitized, { ip: '127.0.0.1' });
    assert.ok(saved.id.startsWith('enr_'));
    assert.strictEqual(saved.type, 'enrollment');

    const all = storage.getAllSubmissions();
    const found = all.enrollments.find(e => e.id === saved.id);
    assert.ok(found);
    assert.strictEqual(found.childFirstName, 'Leo');
  });

  test('Defensive check throws if sensitive data is passed to storage', () => {
    const unsafeData = {
      parentName: 'Unsafe Parent',
      email: 'bad@example.com',
      phone: '555-000-1111',
      childFirstName: 'Leo',
      program: 'toddler-care',
      childAgeGroup: '18-36-months',
      message: 'Child has severe asthma and inhaler',
      privacyConsent: true
    };
    assert.throws(() => {
      storage.saveEnrollment(unsafeData);
    }, /Security Error/);
  });

  // =========================================================================
  // 4. UNIT TESTS: RATE LIMITER
  // =========================================================================
  console.log('\n[Suite 4] Rate Limiter flood abuse protection');

  test('Allows requests up to threshold and blocks subsequent ones', () => {
    const limiter = new RateLimiter({ windowMs: 10000, maxSubmissions: 3 });
    const ip = '192.168.1.99';

    const req1 = limiter.checkSubmissionLimit(ip);
    assert.strictEqual(req1.allowed, true);
    assert.strictEqual(req1.remaining, 2);

    const req2 = limiter.checkSubmissionLimit(ip);
    assert.strictEqual(req2.allowed, true);
    assert.strictEqual(req2.remaining, 1);

    const req3 = limiter.checkSubmissionLimit(ip);
    assert.strictEqual(req3.allowed, true);
    assert.strictEqual(req3.remaining, 0);

    const req4 = limiter.checkSubmissionLimit(ip);
    assert.strictEqual(req4.allowed, false);
    assert.strictEqual(req4.remaining, 0);

    // Resetting works
    limiter.resetRateLimit(ip);
    const req5 = limiter.checkSubmissionLimit(ip);
    assert.strictEqual(req5.allowed, true);
    limiter.destroy();
  });

  // =========================================================================
  // 5. INTEGRATION TESTS: LIVE SERVER ENDPOINTS
  // =========================================================================
  console.log('\n[Suite 5] Live HTTP Server & REST API Endpoints');

  let serverInstance;
  try {
    serverInstance = await startServer(TEST_PORT);
  } catch (err) {
    console.error('Failed to start test HTTP server:', err);
    process.exit(1);
  }

  await asyncTest('GET /api/health returns 200 OK with server status', async () => {
    const res = await makeHttpRequest({ path: '/api/health', method: 'GET' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'Sunflower Preschool API');
  });

  await asyncTest('POST /api/enrollment succeeds with 201 for valid submission', async () => {
    const payload = {
      parentName: 'Marcus Aurelius',
      email: 'marcus@example.com',
      phone: '555-444-3322',
      childFirstName: 'Lucius',
      program: 'toddler-care',
      childAgeGroup: '18-36-months',
      preferredStart: 'Fall 2026',
      schedulePreference: 'full-time',
      message: 'Inquiring about daily schedules and open spots.',
      privacyConsent: true
    };
    const res = await makeHttpRequest({
      path: '/api/enrollment',
      method: 'POST',
      headers: { 'X-Test-Bypass-Rate-Limit': 'sunflower-test' },
      body: payload
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.inquiryId.startsWith('enr_'));
  });

  await asyncTest('POST /api/enrollment rejects medical details with 400 SENSITIVE_DATA_DETECTED', async () => {
    const payload = {
      parentName: 'Marcus Aurelius',
      email: 'marcus@example.com',
      phone: '555-444-3322',
      childFirstName: 'Lucius',
      program: 'toddler-care',
      childAgeGroup: '18-36-months',
      message: 'My child has a peanut allergy and requires an epipen.',
      privacyConsent: true
    };
    const res = await makeHttpRequest({
      path: '/api/enrollment',
      method: 'POST',
      headers: { 'X-Test-Bypass-Rate-Limit': 'sunflower-test' },
      body: payload
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'SENSITIVE_DATA_DETECTED');
    assert.ok(res.body.errors.length > 0);
  });

  await asyncTest('POST /api/enrollment rejects full birthdate with 400 SENSITIVE_DATA_DETECTED', async () => {
    const payload = {
      parentName: 'Marcus Aurelius',
      email: 'marcus@example.com',
      phone: '555-444-3322',
      childFirstName: 'Lucius',
      program: 'toddler-care',
      childAgeGroup: '18-36-months',
      preferredStart: '2022-06-15',
      privacyConsent: true
    };
    const res = await makeHttpRequest({
      path: '/api/enrollment',
      method: 'POST',
      headers: { 'X-Test-Bypass-Rate-Limit': 'sunflower-test' },
      body: payload
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'SENSITIVE_DATA_DETECTED');
  });

  await asyncTest('POST /api/enrollment rejects honeypot spam with 400 SPAM_DETECTED', async () => {
    const payload = {
      parentName: 'Spam Bot',
      email: 'bot@spam.com',
      phone: '555-111-2222',
      childFirstName: 'Bot',
      program: 'preschool',
      childAgeGroup: '3-5-years',
      website: 'http://spamlinks.com',
      privacyConsent: true
    };
    const res = await makeHttpRequest({
      path: '/api/enrollment',
      method: 'POST',
      headers: { 'X-Test-Bypass-Rate-Limit': 'sunflower-test' },
      body: payload
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'SPAM_DETECTED');
  });

  await asyncTest('POST /api/contact succeeds with 201 for valid inquiry', async () => {
    const payload = {
      name: 'Diana Prince',
      email: 'diana@example.com',
      phone: '555-888-7766',
      topic: 'programs-curriculum',
      message: 'Hello, I would love to learn more about the Montessori and nature play aspects.',
      privacyConsent: true
    };
    const res = await makeHttpRequest({
      path: '/api/contact',
      method: 'POST',
      headers: { 'X-Test-Bypass-Rate-Limit': 'sunflower-test' },
      body: payload
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.inquiryId.startsWith('cnt_'));
  });

  await asyncTest('POST /api/contact rejects missing required fields with 400 VALIDATION_ERROR', async () => {
    const payload = {
      name: '',
      email: 'invalid-email',
      topic: 'unknown-topic',
      privacyConsent: false
    };
    const res = await makeHttpRequest({
      path: '/api/contact',
      method: 'POST',
      headers: { 'X-Test-Bypass-Rate-Limit': 'sunflower-test' },
      body: payload
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
  });

  await asyncTest('GET /api/unknown returns 404 JSON', async () => {
    const res = await makeHttpRequest({ path: '/api/unknown', method: 'GET' });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'NOT_FOUND');
  });

  // Gracefully close server and clear test data
  serverInstance.close();
  storage.clearSubmissions();

  console.log('\n' + '='.repeat(70));
  console.log(`TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
  console.log('='.repeat(70) + '\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
