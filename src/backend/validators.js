/**
 * Sunflower Preschool - Strict Validation & Sensitive Data Rejection Module
 *
 * Implements rigorous server-side validation for Enrollment and Contact forms.
 * Enforces strict child privacy safeguards by rejecting submissions containing:
 *  1. Children's medical details (allergies, medications, diagnoses, etc.)
 *  2. Full birthdates (calendar dates, DOB formats)
 *  3. Sensitive personal identifiers (SSNs, credit cards, government IDs)
 * Also enforces strict field allowlists, honeypot spam detection, and length constraints.
 */

// Canonical forbidden field names (lowercased without punctuation)
const FORBIDDEN_MEDICAL_FIELDS = new Set([
  'medical',
  'medicalinfo',
  'medical_info',
  'allergies',
  'allergy',
  'medications',
  'medication',
  'conditions',
  'condition',
  'diagnosis',
  'diagnoses',
  'immunizations',
  'immunization',
  'bloodtype',
  'blood_type',
  'healthinfo',
  'health_info',
  'specialneeds',
  'special_needs',
  'disability',
  'disabilities',
  'doctor',
  'physician',
  'pediatrician'
]);

const FORBIDDEN_BIRTHDATE_FIELDS = new Set([
  'birthdate',
  'birthdate',
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birth_date',
  'childdob',
  'child_dob',
  'childbirthdate',
  'child_birthdate',
  'birthday'
]);

const FORBIDDEN_PII_FIELDS = new Set([
  'ssn',
  'socialsecurity',
  'social_security',
  'taxid',
  'tax_id',
  'passport',
  'driverlicense',
  'driver_license',
  'driverslicense',
  'drivers_license',
  'creditcard',
  'credit_card',
  'bankaccount',
  'bank_account',
  'insurancepolicy',
  'insurance_policy',
  'homeaddress',
  'home_address',
  'streetaddress',
  'street_address'
]);

// Medical keywords and phrases (case-insensitive)
const MEDICAL_REGEX_PATTERNS = [
  /\ballerg\w*\b/i,           // allergy, allergic, allergies, allergen
  /\bmedicat\w*\b/i,          // medication, medications, medicated, medicating
  /\bdiagnos\w*\b/i,          // diagnosis, diagnosed, diagnoses, diagnostic
  /\basthma\b/i,
  /\bdiabet\w*\b/i,           // diabetes, diabetic, diabetics
  /\bepipen\b/i,
  /\bseizures?\b/i,           // seizure, seizures
  /\bepilep\w*\b/i,           // epilepsy, epileptic
  /\bautis\w*\b/i,            // autism, autistic
  /\badhd\b/i,
  /\badd\b/i,                 // ADD
  /\biep\b/i,                 // IEP (Individualized Education Plan)
  /\b504\s*plan\b/i,
  /\bvaccin\w*\b/i,           // vaccine, vaccines, vaccinated, vaccination
  /\bimmuniz\w*\b/i,          // immunization, immunizations, immunized
  /\bprescription\w*\b/i,
  /\brx\b/i,
  /\bblood\s*type\b/i,
  /\bpediatrician\w*\b/i,
  /\bmedical\w*\b/i,
  /\bchronic\b/i,
  /\btherap\w*\b/i,           // therapy, therapist, therapists
  /\bhospital\w*\b/i,
  /\bsurger\w*\b/i,           // surgery, surgeries, surgical
  /\bsymptom\w*\b/i,          // symptom, symptoms
  /\blactose\s*intoleran\w*\b/i,
  /\bpeanuts?\b/i,
  /\bglutens?\b/i,
  /\bceliac\b/i,
  /\beczema\b/i,
  /\binhalers?\b/i,
  /\binsulins?\b/i,
  /\bbehavioral\s*disorder\w*\b/i,
  /\bhealth\s*condition\w*\b/i,
  /\bdisabilit\w*\b/i,        // disability, disabilities
  /\bphysician\w*\b/i,
  /\bspecial\s*needs\b/i
];

// Full birthdate regex patterns (calendar date with specific day, month, and year)
const BIRTHDATE_REGEX_PATTERNS = [
  // Numeric: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/,
  // Numeric: MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY
  /\b(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}\b/,
  /\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/,
  // Numeric short years: M/D/YY, MM/DD/YY, DD/MM/YY
  /\b(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:\d{2})\b/,
  /\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:\d{2})\b/,
  // Written: Month Day, Year (e.g., January 15, 2021; 15 Jan 2021; March 3rd 2022)
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:,)?\s+(?:19|20)\d{2}\b/i,
  /\b(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?(?:,)?\s+(?:19|20)\d{2}\b/i,
  // Explicit birthdate indicator phrases
  /\b(?:dob|date\s+of\s+birth|born\s+on|birthday\s+is)\b/i
];

// Sensitive PII regex patterns
const PII_REGEX_PATTERNS = [
  // SSN / Tax ID (e.g. 123-45-6789 or 123 45 6789)
  /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/,
  /\b(?:ssn|social\s*security|tax\s*id)\b/i,
  // Passport / Driver's License / Insurance
  /\bpassport\s*#?\b/i,
  /\bdriver'?s\s*license\b/i,
  /\bdl\s*#\b/i,
  /\bpolicy\s*#\b/i,
  /\bmedicaid\b/i,
  /\bmedicare\b/i,
  /\bbank\s*account\b/i,
  /\brouting\s*number\b/i,
  /\bcredit\s*card\b/i
];

/**
 * Checks if a string contains 13 to 19 digits formatted like a credit or debit card number.
 * Ensures 7-11 digit phone numbers (e.g. 555-123-4567) are NOT false-flagged.
 */
function containsCreditCardNumber(str) {
  if (typeof str !== 'string') return false;
  // Match candidate sequences composed only of digits, dashes, and spaces
  const candidates = str.match(/(?:\d[ -]*?){13,19}/g);
  if (!candidates) return false;
  for (const cand of candidates) {
    const digitsOnly = cand.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes a field key for forbidden name comparisons (e.g. 'child_dob' -> 'childdob')
 */
function normalizeKey(key) {
  return key.toLowerCase().replace(/[-_\s]/g, '');
}

/**
 * Detects sensitive data across payload keys and text field values.
 * Returns an object with detected errors categorized.
 */
function detectSensitiveData(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { hasSensitiveData: false, errors };
  }

  // 1. Check Payload Keys for Forbidden Names
  for (const key of Object.keys(payload)) {
    const norm = normalizeKey(key);
    if (FORBIDDEN_MEDICAL_FIELDS.has(norm)) {
      errors.push({
        field: key,
        category: 'medical',
        reason: "Medical details are not permitted. Please do not include health or medical information in inquiries."
      });
    } else if (FORBIDDEN_BIRTHDATE_FIELDS.has(norm)) {
      errors.push({
        field: key,
        category: 'birthdate',
        reason: "Full birthdate fields are not permitted. Please select an age group instead."
      });
    } else if (FORBIDDEN_PII_FIELDS.has(norm)) {
      errors.push({
        field: key,
        category: 'pii',
        reason: "Sensitive personal identifiers (SSN, ID, financial details) are strictly prohibited."
      });
    }
  }

  // 2. Scan Text Values for Sensitive Patterns
  for (const [key, rawValue] of Object.entries(payload)) {
    if (typeof rawValue !== 'string') continue;
    const value = rawValue.trim();
    if (!value) continue;

    // Check Medical Patterns
    for (const pattern of MEDICAL_REGEX_PATTERNS) {
      if (pattern.test(value)) {
        errors.push({
          field: key,
          category: 'medical',
          reason: "Children's medical details detected. Please do not submit medical or health information via online inquiry forms."
        });
        break; // One medical reason per field is sufficient
      }
    }

    // Check Birthdate Patterns
    for (const pattern of BIRTHDATE_REGEX_PATTERNS) {
      if (pattern.test(value)) {
        errors.push({
          field: key,
          category: 'birthdate',
          reason: "Full birthdate pattern detected. Please use general age groups (e.g. 18-36 months, 3-5 years) or general timeframe (e.g. Fall 2026)."
        });
        break;
      }
    }

    // Check PII Patterns & Credit Card Numbers
    for (const pattern of PII_REGEX_PATTERNS) {
      if (pattern.test(value)) {
        errors.push({
          field: key,
          category: 'pii',
          reason: "Sensitive personal or financial identifier detected. Please remove government IDs, SSNs, or payment details."
        });
        break;
      }
    }

    if (containsCreditCardNumber(value)) {
      errors.push({
        field: key,
        category: 'pii',
        reason: "Payment or account card number pattern detected. Please do not submit card information."
      });
    }
  }

  return {
    hasSensitiveData: errors.length > 0,
    errors
  };
}

/**
 * Detects spam submission via honeypot field or excessive external links.
 */
function detectSpam(payload) {
  if (!payload || typeof payload !== 'object') {
    return { isSpam: false, errors: [] };
  }

  // Check Honeypot Fields (website, honeypot)
  if (typeof payload.website === 'string' && payload.website.trim().length > 0) {
    return {
      isSpam: true,
      errors: [{ field: 'website', reason: 'Spam honeypot triggered.' }]
    };
  }
  if (typeof payload.honeypot === 'string' && payload.honeypot.trim().length > 0) {
    return {
      isSpam: true,
      errors: [{ field: 'honeypot', reason: 'Spam honeypot triggered.' }]
    };
  }

  // Check URL / Link Spam in text fields
  for (const [key, val] of Object.entries(payload)) {
    if (typeof val === 'string') {
      const urls = val.match(/https?:\/\/[^\s]+/gi);
      if (urls && urls.length >= 2) {
        return {
          isSpam: true,
          errors: [{ field: key, reason: 'Excessive URLs detected in message.' }]
        };
      }
      if (/\[url=|<a\s+href=/i.test(val)) {
        return {
          isSpam: true,
          errors: [{ field: key, reason: 'Link markup spam detected.' }]
        };
      }
    }
  }

  return { isSpam: false, errors: [] };
}

// Allowed fields for Enrollment and Contact forms
const ENROLLMENT_ALLOWED_FIELDS = new Set([
  'parentName',
  'email',
  'phone',
  'childFirstName',
  'program',
  'childAgeGroup',
  'preferredStart',
  'schedulePreference',
  'message',
  'privacyConsent',
  'website',
  'honeypot'
]);

const CONTACT_ALLOWED_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'topic',
  'message',
  'privacyConsent',
  'website',
  'honeypot'
]);

// Enum value sets
const VALID_PROGRAMS = new Set(['toddler-care', 'preschool', 'school-age-care']);
const VALID_AGE_GROUPS = new Set(['18-36-months', '3-5-years', '5-10-years']);
const VALID_SCHEDULES = new Set(['full-time', 'part-time', 'after-school', '']);
const VALID_CONTACT_TOPICS = new Set([
  'general-inquiry',
  'programs-curriculum',
  'schedule-tour',
  'enrollment-question'
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

/**
 * Validates an Enrollment inquiry payload.
 * Returns { isValid: boolean, code?: string, message?: string, errors?: Array, sanitized?: Object }
 */
function validateEnrollment(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload: must be a JSON object.',
      errors: [{ field: 'payload', reason: 'Payload must be a valid JSON object.' }]
    };
  }

  // 1. Sensitive Data Scan (Immediate Priority Rejection)
  const sensitiveCheck = detectSensitiveData(payload);
  if (sensitiveCheck.hasSensitiveData) {
    return {
      isValid: false,
      code: 'SENSITIVE_DATA_DETECTED',
      message: "Submission contains sensitive information (medical details, full birthdates, or private personal data) that cannot be processed online. Sunflower Preschool prioritizes child privacy.",
      errors: sensitiveCheck.errors
    };
  }

  // 2. Spam / Honeypot Check
  const spamCheck = detectSpam(payload);
  if (spamCheck.isSpam) {
    return {
      isValid: false,
      code: 'SPAM_DETECTED',
      message: 'Spam submission detected.',
      errors: spamCheck.errors
    };
  }

  // 3. Strict Field Allowlist Check
  const unexpectedFields = [];
  for (const key of Object.keys(payload)) {
    if (!ENROLLMENT_ALLOWED_FIELDS.has(key)) {
      unexpectedFields.push(key);
    }
  }
  if (unexpectedFields.length > 0) {
    return {
      isValid: false,
      code: 'UNEXPECTED_FIELD',
      message: `Unexpected field(s) in payload: ${unexpectedFields.join(', ')}`,
      errors: unexpectedFields.map(f => ({ field: f, reason: 'Field is not permitted in enrollment inquiry schema.' }))
    };
  }

  const errors = [];

  // 4. Required Field Formats & Constraints
  // parentName: required, 2-100 chars
  const parentName = typeof payload.parentName === 'string' ? payload.parentName.trim() : '';
  if (!parentName || parentName.length < 2 || parentName.length > 100) {
    errors.push({ field: 'parentName', reason: 'Parent/Guardian name is required (2 to 100 characters).' });
  }

  // email: required, valid email
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || !EMAIL_REGEX.test(email) || email.length > 100) {
    errors.push({ field: 'email', reason: 'A valid email address is required.' });
  }

  // phone: required, 7-20 chars
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  if (!phone || !PHONE_REGEX.test(phone)) {
    errors.push({ field: 'phone', reason: 'A valid phone number is required (7 to 20 digits/characters).' });
  }

  // childFirstName: required, 1-60 chars (first name or nickname only)
  const childFirstName = typeof payload.childFirstName === 'string' ? payload.childFirstName.trim() : '';
  if (!childFirstName || childFirstName.length < 1 || childFirstName.length > 60) {
    errors.push({ field: 'childFirstName', reason: 'Child first name or nickname is required (1 to 60 characters).' });
  }

  // program: required enum
  const program = typeof payload.program === 'string' ? payload.program.trim() : '';
  if (!VALID_PROGRAMS.has(program)) {
    errors.push({ field: 'program', reason: `Program must be one of: ${Array.from(VALID_PROGRAMS).join(', ')}.` });
  }

  // childAgeGroup: required enum
  const childAgeGroup = typeof payload.childAgeGroup === 'string' ? payload.childAgeGroup.trim() : '';
  if (!VALID_AGE_GROUPS.has(childAgeGroup)) {
    errors.push({ field: 'childAgeGroup', reason: `Age group must be one of: ${Array.from(VALID_AGE_GROUPS).join(', ')}.` });
  }

  // preferredStart: optional string, max 60 chars
  let preferredStart = '';
  if (payload.preferredStart !== undefined && payload.preferredStart !== null) {
    preferredStart = String(payload.preferredStart).trim();
    if (preferredStart.length > 60) {
      errors.push({ field: 'preferredStart', reason: 'Preferred start timeframe must be 60 characters or less.' });
    }
  }

  // schedulePreference: optional enum
  let schedulePreference = '';
  if (payload.schedulePreference !== undefined && payload.schedulePreference !== null) {
    schedulePreference = String(payload.schedulePreference).trim();
    if (schedulePreference && !VALID_SCHEDULES.has(schedulePreference)) {
      errors.push({ field: 'schedulePreference', reason: `Schedule preference must be one of: ${Array.from(VALID_SCHEDULES).filter(Boolean).join(', ')}.` });
    }
  }

  // message: optional string, max 600 chars
  let message = '';
  if (payload.message !== undefined && payload.message !== null) {
    message = String(payload.message).trim();
    if (message.length > 600) {
      errors.push({ field: 'message', reason: 'Message must be 600 characters or less.' });
    }
  }

  // privacyConsent: required, strictly true
  const privacyConsent = payload.privacyConsent === true || payload.privacyConsent === 'true';
  if (!privacyConsent) {
    errors.push({
      field: 'privacyConsent',
      reason: 'You must confirm that you will not submit sensitive medical or birthdate details and acknowledge inquiry policies.'
    });
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      code: 'VALIDATION_ERROR',
      message: 'One or more required fields are invalid or missing.',
      errors
    };
  }

  return {
    isValid: true,
    sanitized: {
      parentName,
      email,
      phone,
      childFirstName,
      program,
      childAgeGroup,
      preferredStart: preferredStart || null,
      schedulePreference: schedulePreference || null,
      message: message || '',
      privacyConsent: true
    }
  };
}

/**
 * Validates a Contact inquiry payload.
 * Returns { isValid: boolean, code?: string, message?: string, errors?: Array, sanitized?: Object }
 */
function validateContact(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload: must be a JSON object.',
      errors: [{ field: 'payload', reason: 'Payload must be a valid JSON object.' }]
    };
  }

  // 1. Sensitive Data Scan (Immediate Priority Rejection)
  const sensitiveCheck = detectSensitiveData(payload);
  if (sensitiveCheck.hasSensitiveData) {
    return {
      isValid: false,
      code: 'SENSITIVE_DATA_DETECTED',
      message: "Submission contains sensitive information (medical details, full birthdates, or private personal data) that cannot be processed online. Sunflower Preschool prioritizes child privacy.",
      errors: sensitiveCheck.errors
    };
  }

  // 2. Spam / Honeypot Check
  const spamCheck = detectSpam(payload);
  if (spamCheck.isSpam) {
    return {
      isValid: false,
      code: 'SPAM_DETECTED',
      message: 'Spam submission detected.',
      errors: spamCheck.errors
    };
  }

  // 3. Strict Field Allowlist Check
  const unexpectedFields = [];
  for (const key of Object.keys(payload)) {
    if (!CONTACT_ALLOWED_FIELDS.has(key)) {
      unexpectedFields.push(key);
    }
  }
  if (unexpectedFields.length > 0) {
    return {
      isValid: false,
      code: 'UNEXPECTED_FIELD',
      message: `Unexpected field(s) in payload: ${unexpectedFields.join(', ')}`,
      errors: unexpectedFields.map(f => ({ field: f, reason: 'Field is not permitted in contact inquiry schema.' }))
    };
  }

  const errors = [];

  // 4. Required Field Formats & Constraints
  // name: required, 2-100 chars
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name || name.length < 2 || name.length > 100) {
    errors.push({ field: 'name', reason: 'Name is required (2 to 100 characters).' });
  }

  // email: required, valid email
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || !EMAIL_REGEX.test(email) || email.length > 100) {
    errors.push({ field: 'email', reason: 'A valid email address is required.' });
  }

  // phone: optional string, 7-20 chars if provided
  let phone = '';
  if (payload.phone !== undefined && payload.phone !== null) {
    const rawPhone = String(payload.phone).trim();
    if (rawPhone.length > 0) {
      if (!PHONE_REGEX.test(rawPhone)) {
        errors.push({ field: 'phone', reason: 'If provided, phone number must be valid (7 to 20 digits/characters).' });
      } else {
        phone = rawPhone;
      }
    }
  }

  // topic: required enum
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  if (!VALID_CONTACT_TOPICS.has(topic)) {
    errors.push({ field: 'topic', reason: `Topic must be one of: ${Array.from(VALID_CONTACT_TOPICS).join(', ')}.` });
  }

  // message: required string, 10-800 chars
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length < 10 || message.length > 800) {
    errors.push({ field: 'message', reason: 'Message is required (10 to 800 characters).' });
  }

  // privacyConsent: required, strictly true
  const privacyConsent = payload.privacyConsent === true || payload.privacyConsent === 'true';
  if (!privacyConsent) {
    errors.push({
      field: 'privacyConsent',
      reason: 'You must confirm that you will not submit sensitive medical or personal details.'
    });
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      code: 'VALIDATION_ERROR',
      message: 'One or more required fields are invalid or missing.',
      errors
    };
  }

  return {
    isValid: true,
    sanitized: {
      name,
      email,
      phone: phone || null,
      topic,
      message,
      privacyConsent: true
    }
  };
}

module.exports = {
  detectSensitiveData,
  detectSpam,
  validateEnrollment,
  validateContact,
  FORBIDDEN_MEDICAL_FIELDS,
  FORBIDDEN_BIRTHDATE_FIELDS,
  FORBIDDEN_PII_FIELDS,
  ENROLLMENT_ALLOWED_FIELDS,
  CONTACT_ALLOWED_FIELDS
};
