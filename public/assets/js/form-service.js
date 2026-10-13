/**
 * Sunflower Preschool - Browser Client Bridge (Form Service)
 *
 * Exposes window.SunflowerAPI for client-side validation and API communication.
 * Contains ZERO DOM manipulation or visual styling — pure data and logic contract.
 * Works seamlessly in modern browsers and CommonJS/bundler environments.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node / CommonJS
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else {
    // Browser Global
    root.SunflowerAPI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Medical keywords (case-insensitive)
  var MEDICAL_PATTERNS = [
    /\ballerg\w*\b/i,
    /\bmedicat\w*\b/i,
    /\bdiagnos\w*\b/i,
    /\basthma\b/i,
    /\bdiabet\w*\b/i,
    /\bepipen\b/i,
    /\bseizures?\b/i,
    /\bepilep\w*\b/i,
    /\bautis\w*\b/i,
    /\badhd\b/i,
    /\badd\b/i,
    /\biep\b/i,
    /\b504\s*plan\b/i,
    /\bvaccin\w*\b/i,
    /\bimmuniz\w*\b/i,
    /\bprescription\w*\b/i,
    /\brx\b/i,
    /\bblood\s*type\b/i,
    /\bpediatrician\w*\b/i,
    /\bmedical\w*\b/i,
    /\bchronic\b/i,
    /\btherap\w*\b/i,
    /\bhospital\w*\b/i,
    /\bsurger\w*\b/i,
    /\bsymptom\w*\b/i,
    /\blactose\s*intoleran\w*\b/i,
    /\bpeanuts?\b/i,
    /\bglutens?\b/i,
    /\bceliac\b/i,
    /\beczema\b/i,
    /\binhalers?\b/i,
    /\binsulins?\b/i,
    /\bbehavioral\s*disorder\w*\b/i,
    /\bhealth\s*condition\w*\b/i,
    /\bdisabilit\w*\b/i,
    /\bphysician\w*\b/i,
    /\bspecial\s*needs\b/i
  ];

  // Calendar date patterns
  var BIRTHDATE_PATTERNS = [
    /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/,
    /\b(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}\b/,
    /\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/,
    /\b(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:\d{2})\b/,
    /\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:\d{2})\b/,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:,)?\s+(?:19|20)\d{2}\b/i,
    /\b(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?(?:,)?\s+(?:19|20)\d{2}\b/i,
    /\b(?:dob|date\s+of\s+birth|born\s+on|birthday\s+is)\b/i
  ];

  // PII patterns
  var PII_PATTERNS = [
    /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/,
    /\b(?:ssn|social\s*security|tax\s*id)\b/i,
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

  var FORBIDDEN_MEDICAL_KEYS = [
    'medical', 'medicalinfo', 'allergies', 'allergy', 'medications', 'medication',
    'conditions', 'condition', 'diagnosis', 'diagnoses', 'immunizations', 'immunization',
    'bloodtype', 'healthinfo', 'specialneeds', 'disability', 'doctor', 'physician', 'pediatrician'
  ];

  var FORBIDDEN_BIRTHDATE_KEYS = [
    'birthdate', 'dob', 'dateofbirth', 'childdob', 'childbirthdate', 'birthday'
  ];

  var FORBIDDEN_PII_KEYS = [
    'ssn', 'socialsecurity', 'taxid', 'passport', 'driverlicense', 'creditcard',
    'bankaccount', 'insurancepolicy', 'homeaddress', 'streetaddress'
  ];

  var ENROLLMENT_ALLOWED = [
    'parentName', 'email', 'phone', 'childFirstName', 'program', 'childAgeGroup',
    'preferredStart', 'schedulePreference', 'message', 'privacyConsent', 'website', 'honeypot'
  ];

  var CONTACT_ALLOWED = [
    'name', 'email', 'phone', 'topic', 'message', 'privacyConsent', 'website', 'honeypot'
  ];

  var EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  var PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;

  function normKey(k) {
    return String(k).toLowerCase().replace(/[-_\s]/g, '');
  }

  function hasCreditCard(str) {
    if (typeof str !== 'string') return false;
    var candidates = str.match(/(?:\d[ -]*?){13,19}/g);
    if (!candidates) return false;
    for (var i = 0; i < candidates.length; i++) {
      var d = candidates[i].replace(/\D/g, '');
      if (d.length >= 13 && d.length <= 19) return true;
    }
    return false;
  }

  function detectSensitive(payload) {
    var errors = [];
    if (!payload || typeof payload !== 'object') return { hasSensitiveData: false, errors: errors };

    var keys = Object.keys(payload);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var nk = normKey(k);
      if (FORBIDDEN_MEDICAL_KEYS.indexOf(nk) !== -1) {
        errors.push({ field: k, category: 'medical', reason: "Medical details are not permitted. Please do not submit medical information in inquiries." });
      } else if (FORBIDDEN_BIRTHDATE_KEYS.indexOf(nk) !== -1) {
        errors.push({ field: k, category: 'birthdate', reason: "Full birthdate fields are not permitted. Please select an age group instead." });
      } else if (FORBIDDEN_PII_KEYS.indexOf(nk) !== -1) {
        errors.push({ field: k, category: 'pii', reason: "Sensitive personal identifiers (SSN, ID, financial details) are strictly prohibited." });
      }
    }

    for (var j = 0; j < keys.length; j++) {
      var fieldKey = keys[j];
      var val = payload[fieldKey];
      if (typeof val !== 'string') continue;
      var str = val.trim();
      if (!str) continue;

      for (var m = 0; m < MEDICAL_PATTERNS.length; m++) {
        if (MEDICAL_PATTERNS[m].test(str)) {
          errors.push({ field: fieldKey, category: 'medical', reason: "Children's medical details detected. Please do not submit medical or health information." });
          break;
        }
      }

      for (var b = 0; b < BIRTHDATE_PATTERNS.length; b++) {
        if (BIRTHDATE_PATTERNS[b].test(str)) {
          errors.push({ field: fieldKey, category: 'birthdate', reason: "Full birthdate pattern detected. Please select general age group instead." });
          break;
        }
      }

      for (var p = 0; p < PII_PATTERNS.length; p++) {
        if (PII_PATTERNS[p].test(str)) {
          errors.push({ field: fieldKey, category: 'pii', reason: "Sensitive personal or financial identifier detected." });
          break;
        }
      }

      if (hasCreditCard(str)) {
        errors.push({ field: fieldKey, category: 'pii', reason: "Payment card number pattern detected. Please do not submit financial card info." });
      }
    }

    return { hasSensitiveData: errors.length > 0, errors: errors };
  }

  function detectSpam(payload) {
    if (!payload || typeof payload !== 'object') return { isSpam: false, errors: [] };
    if (typeof payload.website === 'string' && payload.website.trim().length > 0) {
      return { isSpam: true, errors: [{ field: 'website', reason: 'Spam honeypot triggered.' }] };
    }
    if (typeof payload.honeypot === 'string' && payload.honeypot.trim().length > 0) {
      return { isSpam: true, errors: [{ field: 'honeypot', reason: 'Spam honeypot triggered.' }] };
    }
    var keys = Object.keys(payload);
    for (var i = 0; i < keys.length; i++) {
      var val = payload[keys[i]];
      if (typeof val === 'string') {
        var urls = val.match(/https?:\/\/[^\s]+/gi);
        if (urls && urls.length >= 2) {
          return { isSpam: true, errors: [{ field: keys[i], reason: 'Excessive URLs detected in message.' }] };
        }
        if (/\[url=|<a\s+href=/i.test(val)) {
          return { isSpam: true, errors: [{ field: keys[i], reason: 'Link markup spam detected.' }] };
        }
      }
    }
    return { isSpam: false, errors: [] };
  }

  function validateEnrollment(payload) {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, code: 'VALIDATION_ERROR', message: 'Payload must be an object.', errors: [{ field: 'payload', reason: 'Invalid format' }] };
    }

    var sensitive = detectSensitive(payload);
    if (sensitive.hasSensitiveData) {
      return {
        isValid: false,
        code: 'SENSITIVE_DATA_DETECTED',
        message: "Submission contains sensitive information (medical details, full birthdates, or private personal data) that cannot be processed online. Sunflower Preschool prioritizes child privacy.",
        errors: sensitive.errors
      };
    }

    var spam = detectSpam(payload);
    if (spam.isSpam) {
      return { isValid: false, code: 'SPAM_DETECTED', message: 'Spam submission detected.', errors: spam.errors };
    }

    var errors = [];
    var pName = typeof payload.parentName === 'string' ? payload.parentName.trim() : '';
    if (!pName || pName.length < 2 || pName.length > 100) {
      errors.push({ field: 'parentName', reason: 'Parent/Guardian name is required (2 to 100 characters).' });
    }

    var email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      errors.push({ field: 'email', reason: 'A valid email address is required.' });
    }

    var phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
    if (!phone || !PHONE_RE.test(phone)) {
      errors.push({ field: 'phone', reason: 'A valid phone number is required (7 to 20 digits).' });
    }

    var cName = typeof payload.childFirstName === 'string' ? payload.childFirstName.trim() : '';
    if (!cName || cName.length < 1 || cName.length > 60) {
      errors.push({ field: 'childFirstName', reason: 'Child first name or nickname is required (1 to 60 characters).' });
    }

    var validProgs = ['toddler-care', 'preschool', 'school-age-care'];
    if (validProgs.indexOf(payload.program) === -1) {
      errors.push({ field: 'program', reason: 'Program must be toddler-care, preschool, or school-age-care.' });
    }

    var validAges = ['18-36-months', '3-5-years', '5-10-years'];
    if (validAges.indexOf(payload.childAgeGroup) === -1) {
      errors.push({ field: 'childAgeGroup', reason: 'Age group must be 18-36-months, 3-5-years, or 5-10-years.' });
    }

    var consent = payload.privacyConsent === true || payload.privacyConsent === 'true';
    if (!consent) {
      errors.push({ field: 'privacyConsent', reason: 'Privacy consent is required.' });
    }

    if (errors.length > 0) {
      return { isValid: false, code: 'VALIDATION_ERROR', message: 'One or more required fields are invalid.', errors: errors };
    }

    return { isValid: true };
  }

  function validateContact(payload) {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, code: 'VALIDATION_ERROR', message: 'Payload must be an object.', errors: [{ field: 'payload', reason: 'Invalid format' }] };
    }

    var sensitive = detectSensitive(payload);
    if (sensitive.hasSensitiveData) {
      return {
        isValid: false,
        code: 'SENSITIVE_DATA_DETECTED',
        message: "Submission contains sensitive information (medical details, full birthdates, or private personal data) that cannot be processed online. Sunflower Preschool prioritizes child privacy.",
        errors: sensitive.errors
      };
    }

    var spam = detectSpam(payload);
    if (spam.isSpam) {
      return { isValid: false, code: 'SPAM_DETECTED', message: 'Spam submission detected.', errors: spam.errors };
    }

    var errors = [];
    var name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || name.length < 2 || name.length > 100) {
      errors.push({ field: 'name', reason: 'Name is required (2 to 100 characters).' });
    }

    var email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      errors.push({ field: 'email', reason: 'A valid email address is required.' });
    }

    if (payload.phone) {
      var phone = String(payload.phone).trim();
      if (phone && !PHONE_RE.test(phone)) {
        errors.push({ field: 'phone', reason: 'If provided, phone number must be valid (7 to 20 digits).' });
      }
    }

    var validTopics = ['general-inquiry', 'programs-curriculum', 'schedule-tour', 'enrollment-question'];
    if (validTopics.indexOf(payload.topic) === -1) {
      errors.push({ field: 'topic', reason: 'Please select a valid inquiry topic.' });
    }

    var msg = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (!msg || msg.length < 10 || msg.length > 800) {
      errors.push({ field: 'message', reason: 'Message is required (10 to 800 characters).' });
    }

    var consent = payload.privacyConsent === true || payload.privacyConsent === 'true';
    if (!consent) {
      errors.push({ field: 'privacyConsent', reason: 'Privacy consent is required.' });
    }

    if (errors.length > 0) {
      return { isValid: false, code: 'VALIDATION_ERROR', message: 'One or more required fields are invalid.', errors: errors };
    }

    return { isValid: true };
  }

  /**
   * Submits Enrollment inquiry to backend API with automatic client validation and offline preview fallback.
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async function submitEnrollment(payload) {
    // 1. Run immediate client validation
    var clientValidation = validateEnrollment(payload);
    if (!clientValidation.isValid) {
      return {
        success: false,
        code: clientValidation.code,
        message: clientValidation.message,
        errors: clientValidation.errors
      };
    }

    // 2. Transmit to server API
    try {
      var response = await fetch('/api/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      var data = await response.json();
      return {
        success: response.ok,
        status: response.status,
        ...data
      };
    } catch (err) {
      // Offline / Static Preview Fallback
      return {
        success: true,
        isOfflineFallback: true,
        message: 'Inquiry received in static preview mode. (Node API server is not connected; validation passed.)',
        inquiryId: 'preview_' + Date.now()
      };
    }
  }

  /**
   * Submits Contact inquiry to backend API with automatic client validation and offline preview fallback.
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async function submitContact(payload) {
    // 1. Run immediate client validation
    var clientValidation = validateContact(payload);
    if (!clientValidation.isValid) {
      return {
        success: false,
        code: clientValidation.code,
        message: clientValidation.message,
        errors: clientValidation.errors
      };
    }

    // 2. Transmit to server API
    try {
      var response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      var data = await response.json();
      return {
        success: response.ok,
        status: response.status,
        ...data
      };
    } catch (err) {
      // Offline / Static Preview Fallback
      return {
        success: true,
        isOfflineFallback: true,
        message: 'Message received in static preview mode. (Node API server is not connected; validation passed.)',
        inquiryId: 'preview_' + Date.now()
      };
    }
  }

  return {
    submitEnrollment: submitEnrollment,
    submitContact: submitContact,
    validateEnrollment: validateEnrollment,
    validateContact: validateContact
  };
});
