/**
 * Sunflower Preschool - Main Client Interactivity Script
 *
 * Handles:
 * 1. Mobile responsive navigation drawer & ARIA accessibility
 * 2. Program routine & age cohort tab switching
 * 3. Enrollment form integration with window.SunflowerAPI & accessible validation feedback
 * 4. Contact form integration with window.SunflowerAPI & accessible validation feedback
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Mobile Navigation Drawer & Keyboard Accessibility
  // ---------------------------------------------------------------------------
  function initNavigation() {
    var navToggle = document.getElementById('nav-toggle');
    var primaryNav = document.getElementById('primary-nav-menu');

    if (!navToggle || !primaryNav) return;

    function toggleMenu(open) {
      var isCurrentlyOpen = navToggle.getAttribute('aria-expanded') === 'true';
      var shouldOpen = typeof open === 'boolean' ? open : !isCurrentlyOpen;

      navToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      if (shouldOpen) {
        primaryNav.classList.add('open');
      } else {
        primaryNav.classList.remove('open');
      }
      document.body.classList.toggle('menu-open', shouldOpen);
      document.body.style.overflow = shouldOpen ? 'hidden' : '';
    }

    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });

    // Close when pressing Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        toggleMenu(false);
        navToggle.focus();
      }
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
      if (navToggle.getAttribute('aria-expanded') === 'true') {
        if (!primaryNav.contains(e.target) && !navToggle.contains(e.target)) {
          toggleMenu(false);
        }
      }
    });

    // Reset when resizing back to desktop screen width
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080 && navToggle.getAttribute('aria-expanded') === 'true') {
        toggleMenu(false);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Program Schedule & Routine Tabs
  // ---------------------------------------------------------------------------
  function initRoutineTabs() {
    var containers = document.querySelectorAll('.routine-tabs-container');

    containers.forEach(function (container) {
      var tabs = container.querySelectorAll('.tab-btn');
      var panels = container.querySelectorAll('.tab-panel');

      if (!tabs.length || !panels.length) return;

      function selectTab(selectedTab) {
        var targetId = selectedTab.getAttribute('aria-controls');

        tabs.forEach(function (tab) {
          var isSelected = tab === selectedTab;
          tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          tab.tabIndex = isSelected ? 0 : -1;
        });

        panels.forEach(function (panel) {
          if (panel.id === targetId) {
            panel.classList.add('active');
            panel.removeAttribute('hidden');
          } else {
            panel.classList.remove('active');
            panel.setAttribute('hidden', '');
          }
        });
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () {
          selectTab(tab);
        });

        // Accessible Keyboard navigation across tabs
        tab.addEventListener('keydown', function (e) {
          var nextIndex;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextIndex = (index + 1) % tabs.length;
            tabs[nextIndex].focus();
            selectTab(tabs[nextIndex]);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nextIndex = (index - 1 + tabs.length) % tabs.length;
            tabs[nextIndex].focus();
            selectTab(tabs[nextIndex]);
          }
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Form Error & State Helpers
  // ---------------------------------------------------------------------------
  function clearFormErrors(form, alertBanner) {
    if (alertBanner) {
      alertBanner.classList.remove('visible', 'alert-banner-error', 'alert-banner-success');
      alertBanner.innerHTML = '';
    }

    var invalidInputs = form.querySelectorAll('[aria-invalid="true"]');
    invalidInputs.forEach(function (input) {
      input.removeAttribute('aria-invalid');
    });

    var errorContainers = form.querySelectorAll('.field-error-msg');
    errorContainers.forEach(function (container) {
      container.classList.remove('visible');
      container.textContent = '';
    });
  }

  function renderFieldErrors(form, errors) {
    if (!Array.isArray(errors)) return;

    errors.forEach(function (err) {
      var fieldName = err.field;
      var reason = err.reason || 'Invalid input.';

      // Map field name to DOM input
      var input = form.querySelector('[name="' + fieldName + '"]') ||
                  form.querySelector('#' + fieldName) ||
                  form.querySelector('#' + fieldName.replace(/([A-Z])/g, '-$1').toLowerCase());

      if (input) {
        input.setAttribute('aria-invalid', 'true');
      }

      // Find dedicated field error container
      var errorContainer = form.querySelector('#err-' + fieldName) ||
                           form.querySelector('#err-' + fieldName.replace(/([A-Z])/g, '-$1').toLowerCase());

      if (errorContainer) {
        errorContainer.textContent = reason;
        errorContainer.classList.add('visible');
      }
    });
  }

  function renderSummaryAlert(alertBanner, type, title, message, errorList) {
    if (!alertBanner) return;

    alertBanner.className = 'alert-banner visible ' + (type === 'success' ? 'alert-banner-success' : 'alert-banner-error');

    var html = '<h3>' + escapeHtml(title) + '</h3>';
    if (message) {
      html += '<p>' + escapeHtml(message) + '</p>';
    }

    if (errorList && errorList.length > 0) {
      html += '<ul>';
      errorList.forEach(function (err) {
        var msg = err.reason || err.message || (typeof err === 'string' ? err : 'Please check this field.');
        html += '<li>' + escapeHtml(msg) + '</li>';
      });
      html += '</ul>';
    }

    alertBanner.innerHTML = html;
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alertBanner.focus();
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // 4. Enrollment Form Integration (#enrollment-form)
  // ---------------------------------------------------------------------------
  function initEnrollmentForm() {
    var form = document.getElementById('enrollment-form');
    if (!form) return;

    var alertBanner = document.getElementById('form-alert');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearFormErrors(form, alertBanner);

      if (!window.SunflowerAPI || typeof window.SunflowerAPI.submitEnrollment !== 'function') {
        renderSummaryAlert(
          alertBanner,
          'error',
          'Service Unavailable',
          'The client API service is not loaded. Please refresh the page.'
        );
        return;
      }

      var payload = {
        parentName: (form.querySelector('#parentName') || {}).value || '',
        email: (form.querySelector('#email') || {}).value || '',
        phone: (form.querySelector('#phone') || {}).value || '',
        childFirstName: (form.querySelector('#childFirstName') || {}).value || '',
        program: (form.querySelector('#program') || {}).value || '',
        childAgeGroup: (form.querySelector('#childAgeGroup') || {}).value || '',
        preferredStart: (form.querySelector('#preferredStart') || {}).value || '',
        schedulePreference: (form.querySelector('#schedulePreference') || {}).value || '',
        message: (form.querySelector('#message') || {}).value || '',
        privacyConsent: (form.querySelector('#privacyConsent') || {}).checked === true,
        website: (form.querySelector('#website') || {}).value || ''
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting Inquiry...';
      }

      try {
        var result = await window.SunflowerAPI.submitEnrollment(payload);

        if (result.success) {
          // Success Response
          var successMsg = result.message || 'Your enrollment inquiry has been received.';
          var inquiryId = result.inquiryId ? ' Reference ID: ' + result.inquiryId : '';

          var confirmationHtml =
            '<h3>🌻 Inquiry Received Successfully!</h3>' +
            '<p>' + escapeHtml(successMsg) + '</p>' +
            '<p>Our admissions coordinator will review your inquiry and follow up within 1 to 2 business days to discuss program fit, schedule a personalized campus tour, and answer your questions.</p>' +
            (result.inquiryId ? '<p class="inquiry-id-badge">Inquiry ID: ' + escapeHtml(result.inquiryId) + '</p>' : '') +
            '<div class="disclaimer-box" style="margin-top: 1rem;"><p><strong>Friendly Reminder:</strong> Submitting an inquiry initiates a conversation with our admissions team to explore program fit and availability. It does not guarantee admission or reserve an open space.</p></div>';

          alertBanner.className = 'alert-banner visible alert-banner-success';
          alertBanner.innerHTML = confirmationHtml;
          alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });

          form.reset();
        } else {
          // Failure Response (Sensitive Data, Validation, Spam, or Rate Limit)
          var title = 'Submission Review Required';
          if (result.code === 'SENSITIVE_DATA_DETECTED') {
            title = '⚠️ Sensitive Information Detected';
          } else if (result.code === 'SPAM_DETECTED') {
            title = '⚠️ Submission Blocked';
          } else if (result.code === 'RATE_LIMIT_EXCEEDED') {
            title = '⚠️ Too Many Requests';
          }

          renderSummaryAlert(alertBanner, 'error', title, result.message, result.errors);
          renderFieldErrors(form, result.errors);
        }
      } catch (err) {
        renderSummaryAlert(
          alertBanner,
          'error',
          'Network Error',
          'An unexpected error occurred while transmitting your inquiry. Please try again shortly.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Submit Inquiry';
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Contact Form Integration (#contact-form)
  // ---------------------------------------------------------------------------
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var alertBanner = document.getElementById('form-alert');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearFormErrors(form, alertBanner);

      if (!window.SunflowerAPI || typeof window.SunflowerAPI.submitContact !== 'function') {
        renderSummaryAlert(
          alertBanner,
          'error',
          'Service Unavailable',
          'The client API service is not loaded. Please refresh the page.'
        );
        return;
      }

      var payload = {
        name: (form.querySelector('#name') || {}).value || '',
        email: (form.querySelector('#email') || {}).value || '',
        phone: (form.querySelector('#phone') || {}).value || '',
        topic: (form.querySelector('#topic') || {}).value || '',
        message: (form.querySelector('#message') || {}).value || '',
        privacyConsent: (form.querySelector('#privacyConsent') || {}).checked === true,
        website: (form.querySelector('#website') || {}).value || ''
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending Message...';
      }

      try {
        var result = await window.SunflowerAPI.submitContact(payload);

        if (result.success) {
          var successMsg = result.message || 'Thank you for reaching out to Sunflower Preschool!';

          var confirmationHtml =
            '<h3>🌻 Message Sent Successfully!</h3>' +
            '<p>' + escapeHtml(successMsg) + '</p>' +
            '<p>We look forward to connecting with your family. Our team typically responds within 1 to 2 business days.</p>' +
            (result.inquiryId ? '<p class="inquiry-id-badge">Inquiry ID: ' + escapeHtml(result.inquiryId) + '</p>' : '') +
            '<div class="disclaimer-box" style="margin-top: 1rem;"><p><strong>Friendly Reminder:</strong> Scheduling a tour or submitting an inquiry initiates a conversation with our team to discuss program fit and availability. It does not guarantee admission or reserve an open space.</p></div>';

          alertBanner.className = 'alert-banner visible alert-banner-success';
          alertBanner.innerHTML = confirmationHtml;
          alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });

          form.reset();
        } else {
          var title = 'Submission Review Required';
          if (result.code === 'SENSITIVE_DATA_DETECTED') {
            title = '⚠️ Sensitive Information Detected';
          } else if (result.code === 'SPAM_DETECTED') {
            title = '⚠️ Submission Blocked';
          } else if (result.code === 'RATE_LIMIT_EXCEEDED') {
            title = '⚠️ Too Many Requests';
          }

          renderSummaryAlert(alertBanner, 'error', title, result.message, result.errors);
          renderFieldErrors(form, result.errors);
        }
      } catch (err) {
        renderSummaryAlert(
          alertBanner,
          'error',
          'Network Error',
          'An unexpected error occurred while sending your message. Please try again shortly.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Send Message';
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 6. FAQ Accordion Interaction
  // ---------------------------------------------------------------------------
  function initFaqAccordion() {
    var triggers = document.querySelectorAll('.faq-trigger');
    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        var panelId = trigger.getAttribute('aria-controls');
        var panel = document.getElementById(panelId);

        trigger.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        if (panel) {
          if (isExpanded) {
            panel.setAttribute('hidden', '');
            panel.classList.remove('open');
          } else {
            panel.removeAttribute('hidden');
            panel.classList.add('open');
          }
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 7. DOM Initialization
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initRoutineTabs();
    initEnrollmentForm();
    initContactForm();
    initFaqAccordion();
  });
})();
