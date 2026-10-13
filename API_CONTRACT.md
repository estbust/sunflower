# 🌻 Sunflower Preschool - Backend API & Data Contract

**Specification Version**: 1.0.0  
**Phase**: Phase 1 (Backend, Logic & Persistence)  
**Base URL**: `http://localhost:3000` (configurable via `process.env.PORT`)  
**Architecture**: Multi-Platform (Native Node.js `server.js` + Vercel Serverless Functions in `api/` + GitHub Pages static fallback)  

---

## 📋 Table of Contents
1. [Overview & Security Architecture](#1-overview--security-architecture)
2. [Strict Child Privacy & Sensitive Data Safeguards](#2-strict-child-privacy--sensitive-data-safeguards)
3. [REST API Endpoints](#3-rest-api-endpoints)
   - [POST /api/enrollment](#post-apienrollment)
   - [POST /api/contact](#post-apicontact)
   - [GET /api/health](#get-apihealth)
4. [Standard Error Codes Reference](#4-standard-error-codes-reference)
5. [Browser Client Bridge (`window.SunflowerAPI`)](#5-browser-client-bridge-windowsunflowerapi)
6. [Data Persistence & Storage Schema](#6-data-persistence--storage-schema)
7. [Automated Verification & Test Commands](#7-automated-verification--test-commands)

---

## 1. Overview & Security Architecture

The Sunflower Preschool backend provides robust, reliable REST APIs and static routing designed to support admissions inquiries and contact tour requests.

- **Zero External Dependencies**: Operates exclusively with Node.js standard runtime modules (`http`, `fs`, `path`, `url`), eliminating supply-chain vulnerabilities and deployment friction.
- **Defense in Depth**: Every inquiry passes through a 4-tier filtering pipeline:
  1. **Strict Field Allowlist**: Discards any undeclared or arbitrary fields.
  2. **Sensitive Data Scanner**: Blocks medical details, full birthdates, and private personal identifiers.
  3. **Spam & Abuse Protection**: Evaluates hidden honeypot fields (`website`, `honeypot`), link density, and client IP flood rates.
  4. **Defensive Storage Verification**: Storage layer performs a secondary assertion before any disk write to ensure sensitive data is never persisted.

---

## 2. Strict Child Privacy & Sensitive Data Safeguards

Sunflower Preschool enforces an **absolute prohibition** against submitting sensitive personal data through unauthenticated inquiry web forms.

> [!IMPORTANT]
> The server immediately returns HTTP `400 Bad Request` with `code: "SENSITIVE_DATA_DETECTED"` and field-specific errors if any of the following are submitted:

### 2.1 Children's Medical Details
- **Forbidden Payload Keys**: `medical`, `medicalInfo`, `medical_info`, `allergies`, `allergy`, `medications`, `medication`, `conditions`, `condition`, `diagnosis`, `diagnoses`, `immunizations`, `immunization`, `bloodType`, `healthInfo`, `specialNeeds`, `special_needs`, `disability`, `doctor`, `physician`, `pediatrician`.
- **Forbidden Content Keywords**: Case-insensitive word/pattern matching in any text field (`message`, `parentName`, `childFirstName`, `notes`, `subject`):
  - `allerg*` (allergy, allergies, allergic, allergen)
  - `medicat*` (medication, medications, medicated)
  - `diagnos*` (diagnosis, diagnosed, diagnoses)
  - `asthma`, `epipen`, `inhaler`, `insulin`, `diabet*`, `seizure`, `epilep*`
  - `autis*`, `adhd`, `add`, `iep`, `504 plan`
  - `vaccine`, `vaccinated`, `immuniz*`, `prescription`, `rx`, `blood type`
  - `pediatrician`, `medical`, `chronic`, `therapy`, `therapist`, `hospital`, `surgery`, `symptom`
  - `peanut`, `gluten`, `celiac`, `lactose intoleran*`, `eczema`
  - `behavioral disorder`, `health condition`, `disability`, `special needs`

### 2.2 Full Calendar Birthdates
- **Forbidden Payload Keys**: `birthdate`, `birthDate`, `dob`, `dateOfBirth`, `date_of_birth`, `childDob`, `child_dob`, `childBirthdate`, `birthday`.
- **Forbidden Calendar Patterns**:
  - Numeric formats: `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, `MM-DD-YYYY`, `M/D/YY`, `M/D/YYYY` (e.g., `2021-05-14`, `05/14/2021`, `5/14/21`).
  - Written dates: `Month Day, Year` (e.g., `January 15, 2021`, `15 Jan 2021`, `March 3rd 2022`).
  - Explicit phrases: `dob`, `date of birth`, `born on`, `birthday is`.
- **Permitted Formats**:
  - General age group selections: `"18-36-months"`, `"3-5-years"`, `"5-10-years"`.
  - General preferred start timeframes: `"Fall 2026"`, `"Next Month"`, `"Summer"`, or month/year without day (`"2026-09"`).

### 2.3 Other Sensitive Personal Identifiers (PII)
- **Forbidden Payload Keys**: `ssn`, `socialSecurity`, `taxId`, `passport`, `driverLicense`, `creditCard`, `bankAccount`, `insurancePolicy`, `homeAddress`, `streetAddress`.
- **Forbidden Content Patterns**:
  - SSN / Tax ID: `\b\d{3}[-\s]\d{2}[-\s]\d{4}\b`, `ssn`, `social security`.
  - Payment Cards: Sequences of 13 to 19 digits.
  - Government IDs: `passport #`, `driver's license`, `dl#`, `policy #`, `medicaid`, `medicare`.

---

## 3. REST API Endpoints

### POST `/api/enrollment`
Submit an admission inquiry for a child.

#### Headers
```http
Content-Type: application/json
```
*(Optional test header to bypass rate limiter during automated testing: `X-Test-Bypass-Rate-Limit: sunflower-test`)*

#### Request Body Schema
| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentName` | String | **Yes** | 2–100 chars, trimmed | Full name of parent or legal guardian |
| `email` | String | **Yes** | Valid RFC email, max 100 chars | Primary contact email |
| `phone` | String | **Yes** | 7–20 digits/chars | Primary phone number (e.g. `(555) 234-5678`) |
| `childFirstName` | String | **Yes** | 1–60 chars, trimmed | First name or nickname only (no legal full ID) |
| `program` | String | **Yes** | Enum: `"toddler-care"`, `"preschool"`, `"school-age-care"` | Target learning program |
| `childAgeGroup` | String | **Yes** | Enum: `"18-36-months"`, `"3-5-years"`, `"5-10-years"` | General age developmental cohort |
| `preferredStart` | String | No | Max 60 chars (NO full birthdates) | e.g. `"Fall 2026"`, `"Next Month"` |
| `schedulePreference` | String | No | Enum: `"full-time"`, `"part-time"`, `"after-school"`, `""` | Desired weekly schedule |
| `message` | String | No | Max 600 chars (passes privacy scan) | General questions or notes |
| `privacyConsent` | Boolean | **Yes** | Must be strictly `true` | Confirms understanding of privacy rules |
| `website` | String | No | Must be empty string `""` or omitted | Anti-bot honeypot field |

#### Example Valid Request
```json
{
  "parentName": "Elena Rostova",
  "email": "elena.rostova@example.com",
  "phone": "(555) 234-5678",
  "childFirstName": "Mia",
  "program": "preschool",
  "childAgeGroup": "3-5-years",
  "preferredStart": "Fall 2026",
  "schedulePreference": "full-time",
  "message": "We would like to learn more about the nature playground and preschool curriculum.",
  "privacyConsent": true,
  "website": ""
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Enrollment inquiry submitted successfully",
  "inquiryId": "enr_1791847393922_ccch9e",
  "timestamp": "2026-10-12T23:23:13.922Z"
}
```

#### Sensitive Data Rejection (`400 Bad Request`)
```json
{
  "success": false,
  "code": "SENSITIVE_DATA_DETECTED",
  "message": "Submission contains sensitive information (medical details, full birthdates, or private personal data) that cannot be processed online. Sunflower Preschool prioritizes child privacy.",
  "errors": [
    {
      "field": "message",
      "category": "medical",
      "reason": "Children's medical details detected. Please do not submit medical or health information via online inquiry forms."
    }
  ]
}
```

#### Validation Error (`400 Bad Request`)
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "One or more required fields are invalid or missing.",
  "errors": [
    {
      "field": "email",
      "reason": "A valid email address is required."
    }
  ]
}
```

---

### POST `/api/contact`
Submit a general inquiry or schedule a guided campus tour.

#### Request Body Schema
| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | **Yes** | 2–100 chars, trimmed | Inquirer's full name |
| `email` | String | **Yes** | Valid RFC email | Contact email |
| `phone` | String | No | 7–20 digits/chars if provided | Contact telephone number |
| `topic` | String | **Yes** | Enum: `"general-inquiry"`, `"programs-curriculum"`, `"schedule-tour"`, `"enrollment-question"` | Topic category |
| `message` | String | **Yes** | 10–800 chars (passes privacy scan) | Message inquiry details |
| `privacyConsent` | Boolean | **Yes** | Must be strictly `true` | Privacy policy confirmation |
| `website` | String | No | Must be empty string `""` or omitted | Anti-bot honeypot field |

#### Example Valid Request
```json
{
  "name": "Carlos Mendoza",
  "email": "carlos.mendoza@example.com",
  "phone": "555-987-6543",
  "topic": "schedule-tour",
  "message": "Hello! We would love to book a campus tour next Tuesday morning if available.",
  "privacyConsent": true,
  "website": ""
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Contact inquiry submitted successfully",
  "inquiryId": "cnt_1791847393985_hilkv9",
  "timestamp": "2026-10-12T23:23:13.985Z"
}
```

---

### GET `/api/health`
Health check and system telemetry.

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "Sunflower Preschool API",
  "timestamp": "2026-10-12T23:25:00.000Z",
  "uptime": 124.5
}
```

---

## 4. Standard Error Codes Reference

| Error Code | HTTP Status | Description & Remediation |
| :--- | :--- | :--- |
| `SENSITIVE_DATA_DETECTED` | `400` | Medical details, full calendar birthdate, or sensitive PII detected. Prompt user to remove health info or select an age group. |
| `VALIDATION_ERROR` | `400` | Missing required field, invalid email/phone syntax, or string length bounds violated. |
| `UNEXPECTED_FIELD` | `400` | Payload contains unlisted keys violating strict allowlist. |
| `SPAM_DETECTED` | `400` | Honeypot field filled or excessive marketing links detected in message. |
| `RATE_LIMIT_EXCEEDED` | `429` | Client IP exceeded 20 submissions per 15 minutes. Wait before retry. |
| `PAYLOAD_TOO_LARGE` | `413` | Request body exceeded 50KB memory defense limit. |
| `INVALID_JSON` | `400` | Malformed JSON request syntax. |
| `NOT_FOUND` | `404` | Unrecognized `/api/*` endpoint requested. |

---

## 5. Browser Client Bridge (`window.SunflowerAPI`)

Located at: [`public/assets/js/form-service.js`](file:///home/estbust/proyectos-antigravity/sunflower-preschool/public/assets/js/form-service.js)

The client script exposes a universal API on `window.SunflowerAPI` that:
- Executes client-side validation immediately before network dispatch.
- Communicates directly with `/api/enrollment` and `/api/contact`.
- Provides an **offline preview fallback** if pages are tested locally without the Node server running.
- Contains **ZERO DOM manipulation or CSS** — Frontend authors connect it directly to form submit event handlers.

### Frontend Integration Example
```javascript
// Example in frontend page script:
const enrollmentForm = document.getElementById('enrollment-form');

enrollmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    parentName: document.getElementById('parent-name').value,
    email: document.getElementById('parent-email').value,
    phone: document.getElementById('parent-phone').value,
    childFirstName: document.getElementById('child-first-name').value,
    program: document.getElementById('program-select').value,
    childAgeGroup: document.getElementById('age-group-select').value,
    preferredStart: document.getElementById('preferred-start').value,
    schedulePreference: document.getElementById('schedule-preference').value,
    message: document.getElementById('enrollment-notes').value,
    privacyConsent: document.getElementById('privacy-consent').checked,
    website: document.getElementById('website-honeypot').value
  };

  const result = await window.SunflowerAPI.submitEnrollment(formData);

  if (result.success) {
    // Show success feedback
    console.log('Submission ID:', result.inquiryId);
  } else {
    // Highlight validation or sensitive data errors
    console.warn('Error code:', result.code, result.errors);
  }
});
```

---

## 6. Data Persistence & Storage Schema

Inquiries are persisted to:
[`src/backend/data/submissions.json`](file:///home/estbust/proyectos-antigravity/sunflower-preschool/src/backend/data/submissions.json)

### Record Shape
```json
{
  "enrollments": [
    {
      "id": "enr_1791847393922_ccch9e",
      "type": "enrollment",
      "parentName": "Elena Rostova",
      "email": "elena.rostova@example.com",
      "phone": "(555) 234-5678",
      "childFirstName": "Mia",
      "program": "preschool",
      "childAgeGroup": "3-5-years",
      "preferredStart": "Fall 2026",
      "schedulePreference": "full-time",
      "message": "We would like to learn more about the curriculum.",
      "privacyConsent": true,
      "status": "received",
      "createdAt": "2026-10-12T23:23:13.922Z",
      "clientIp": "192.168.xxx.xxx"
    }
  ],
  "contacts": [
    {
      "id": "cnt_1791847393985_hilkv9",
      "type": "contact",
      "name": "Carlos Mendoza",
      "email": "carlos.mendoza@example.com",
      "phone": "555-987-6543",
      "topic": "schedule-tour",
      "message": "Hello! We would love to book a campus tour.",
      "privacyConsent": true,
      "status": "received",
      "createdAt": "2026-10-12T23:23:13.985Z",
      "clientIp": "192.168.xxx.xxx"
    }
  ]
}
```

---

## 7. Automated Verification & Test Commands

Run the following commands from the project root (`/home/estbust/proyectos-antigravity/sunflower-preschool`):

### 1. Execute Backend Automated Tests
```bash
npm run test:backend
```
Executes 48 automated unit and integration tests covering:
- Enrollment and Contact validation schemas
- Rejection of medical keywords (allergies, medications, asthma, autism, IEP, epipen)
- Rejection of calendar birthdates (`YYYY-MM-DD`, `MM/DD/YYYY`, `Month Day, Year`)
- Rejection of sensitive PII (SSN, credit card, passport #)
- Rate limiting flood abuse protection
- Live HTTP REST endpoints (`/api/health`, `/api/enrollment`, `/api/contact`)
- Vercel Serverless Function handlers (`api/enrollment.js`, `api/contact.js`, `api/health.js`)
- Browser form service (`form-service.js`) with smart static hosting / offline simulated confirmations

### 2. Execute Build & Asset Verification
```bash
npm run build
```
Validates all backend modules, persistence storage, core logo assets, and checks status of all 8 route pages.

### 3. Start Production Server
```bash
npm start
```
Starts native HTTP server on `http://localhost:3000`.
