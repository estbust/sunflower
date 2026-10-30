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

      if (!input && (fieldName === 'privacyConsent' || fieldName === 'privacy_consent')) {
        input = form.querySelector('#privacy_consent') ||
                form.querySelector('#privacyConsent') ||
                form.querySelector('[name="privacy_consent"]') ||
                form.querySelector('[name="privacyConsent"]');
      }

      if (input) {
        input.setAttribute('aria-invalid', 'true');
      }

      // Find dedicated field error container
      var errorContainer = form.querySelector('#err-' + fieldName) ||
                           form.querySelector('#err-' + fieldName.replace(/([A-Z])/g, '-$1').toLowerCase());

      if (!errorContainer && (fieldName === 'privacyConsent' || fieldName === 'privacy_consent')) {
        errorContainer = form.querySelector('#err-privacy_consent') ||
                         form.querySelector('#err-privacyConsent');
      }

      if (errorContainer) {
        errorContainer.textContent = reason;
        errorContainer.classList.add('visible');
      }
    });
  }

  function bindInputErrorClearing(form) {
    if (!form || form.dataset.boundErrorClearing) return;
    form.dataset.boundErrorClearing = 'true';

    var clearTargetError = function (e) {
      var target = e.target;
      if (!target) return;
      if (target.getAttribute('aria-invalid') === 'true' || target.type === 'checkbox') {
        target.removeAttribute('aria-invalid');
        var fieldName = target.name || target.id;
        if (fieldName) {
          var errorContainer = form.querySelector('#err-' + fieldName) ||
                               form.querySelector('#err-' + fieldName.replace(/([A-Z])/g, '-$1').toLowerCase());
          if (!errorContainer && (fieldName === 'privacy_consent' || fieldName === 'privacyConsent')) {
            errorContainer = form.querySelector('#err-privacy_consent') ||
                             form.querySelector('#err-privacyConsent');
          }
          if (errorContainer) {
            errorContainer.classList.remove('visible');
            errorContainer.textContent = '';
          }
          if (fieldName === 'privacy_consent' || fieldName === 'privacyConsent') {
            var altErr = form.querySelector('#err-privacy_consent') || form.querySelector('#err-privacyConsent');
            if (altErr) {
              altErr.classList.remove('visible');
              altErr.textContent = '';
            }
            var altInput = form.querySelector('#privacy_consent') || form.querySelector('#privacyConsent');
            if (altInput) altInput.removeAttribute('aria-invalid');
          }
        }
      }
    };

    form.addEventListener('input', clearTargetError);
    form.addEventListener('change', clearTargetError);
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

    bindInputErrorClearing(form);

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

      if (submitBtn && !submitBtn.dataset.originalText) {
        submitBtn.dataset.originalText = (submitBtn.textContent || '').trim();
      }

      var formData = new FormData(form);
      var turnstileResponse = formData.get('cf-turnstile-response');

      if (!turnstileResponse) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Submit Enrollment Inquiry';
        }
        renderSummaryAlert(
          alertBanner,
          'error',
          'Verification Required',
          'Please complete the security verification challenge before submitting your inquiry.'
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
        privacyConsent: (form.querySelector('#privacy_consent') || form.querySelector('#privacyConsent') || form.querySelector('[name="privacy_consent"]') || form.querySelector('[name="privacyConsent"]') || {}).checked === true,
        privacy_consent: (form.querySelector('#privacy_consent') || form.querySelector('#privacyConsent') || form.querySelector('[name="privacy_consent"]') || form.querySelector('[name="privacyConsent"]') || {}).checked === true,
        website: (form.querySelector('#website') || {}).value || '',
        'cf-turnstile-response': turnstileResponse,
        turnstileResponse: turnstileResponse
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Inquiry...';
      }

      try {
        var result = await window.SunflowerAPI.submitEnrollment(payload);

        if (result.success) {
          // Success Response
          var successMsg = result.message || 'Your enrollment inquiry has been received.';
          var refId = result.inquiryId || (result.data && result.data.inquiryId) || result.id || (result.data && result.data.id) || '';

          var confirmationHtml =
            '<h3>🌻 Inquiry Received Successfully!</h3>' +
            '<p>' + escapeHtml(successMsg) + '</p>' +
            '<p>Our admissions coordinator will review your inquiry and follow up within 1 to 2 business days to discuss program fit, schedule a personalized campus tour, and answer your questions.</p>' +
            (refId ? '<p class="inquiry-id-badge"><strong>Reference ID:</strong> ' + escapeHtml(refId) + '</p>' : '') +
            '<div class="disclaimer-box" style="margin-top: 1rem;"><p><strong>Friendly Reminder:</strong> Submitting an inquiry initiates a conversation with our admissions team to explore program fit and availability. It does not guarantee admission or reserve an open space.</p></div>';

          alertBanner.className = 'alert-banner visible alert-banner-success';
          alertBanner.innerHTML = confirmationHtml;
          alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
          alertBanner.focus();

          form.reset();
          if (window.turnstile && typeof window.turnstile.reset === 'function') {
            try {
              window.turnstile.reset();
            } catch (ignore) {}
          }
        } else {
          // Failure Response (Sensitive Data, Validation, Spam, Rate Limit, or Turnstile Required)
          var title = 'Submission Review Required';
          var explanatoryMsg = result.message || 'Please correct the highlighted fields and resubmit.';

          if (result.code === 'SENSITIVE_DATA_DETECTED') {
            title = '⚠️ Sensitive Information Detected';
            explanatoryMsg = 'Sunflower Preschool is strictly committed to protecting children\'s privacy. Medical conditions, allergies, medications, and full calendar birthdates cannot be submitted through online inquiry forms. Your entered information has been preserved below so you can adjust it.';
          } else if (result.code === 'SPAM_DETECTED') {
            title = '⚠️ Submission Blocked';
            explanatoryMsg = 'Your inquiry was flagged by our automated security filter. Please remove external links or automated input and try again.';
          } else if (result.code === 'RATE_LIMIT_EXCEEDED') {
            title = '⚠️ Submission Limit Reached';
            explanatoryMsg = 'Too many submissions have been received from this connection. Please wait a few moments before trying again.';
          } else if (result.code === 'TURNSTILE_REQUIRED') {
            title = '⚠️ Verification Required';
            explanatoryMsg = 'Please complete the security verification challenge before submitting your inquiry.';
          }

          renderSummaryAlert(alertBanner, 'error', title, explanatoryMsg, result.errors);
          renderFieldErrors(form, result.errors);

          if (window.turnstile && typeof window.turnstile.reset === 'function') {
            try {
              window.turnstile.reset();
            } catch (ignore) {}
          }
        }
      } catch (err) {
        renderSummaryAlert(
          alertBanner,
          'error',
          'Network Transmission Error',
          'We were unable to connect to our servers to transmit your inquiry. Please check your internet connection and try again. Your information has been preserved below so you do not have to re-enter it.'
        );
        if (window.turnstile && typeof window.turnstile.reset === 'function') {
          try {
            window.turnstile.reset();
          } catch (ignore) {}
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Submit Enrollment Inquiry';
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

    bindInputErrorClearing(form);

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

      if (submitBtn && !submitBtn.dataset.originalText) {
        submitBtn.dataset.originalText = (submitBtn.textContent || '').trim();
      }

      var formData = new FormData(form);
      var turnstileResponse = formData.get('cf-turnstile-response');

      if (!turnstileResponse) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Send Message';
        }
        renderSummaryAlert(
          alertBanner,
          'error',
          'Verification Required',
          'Please complete the security verification challenge before submitting your inquiry.'
        );
        return;
      }

      var payload = {
        name: (form.querySelector('#name') || {}).value || '',
        email: (form.querySelector('#email') || {}).value || '',
        phone: (form.querySelector('#phone') || {}).value || '',
        topic: (form.querySelector('#topic') || {}).value || '',
        message: (form.querySelector('#message') || {}).value || '',
        privacyConsent: (form.querySelector('#privacy_consent') || form.querySelector('#privacyConsent') || form.querySelector('[name="privacy_consent"]') || form.querySelector('[name="privacyConsent"]') || {}).checked === true,
        privacy_consent: (form.querySelector('#privacy_consent') || form.querySelector('#privacyConsent') || form.querySelector('[name="privacy_consent"]') || form.querySelector('[name="privacyConsent"]') || {}).checked === true,
        website: (form.querySelector('#website') || {}).value || '',
        'cf-turnstile-response': turnstileResponse,
        turnstileResponse: turnstileResponse
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Message...';
      }

      try {
        var result = await window.SunflowerAPI.submitContact(payload);

        if (result.success) {
          var successMsg = result.message || 'Thank you for reaching out to Sunflower Preschool!';
          var refId = result.inquiryId || (result.data && result.data.inquiryId) || result.id || (result.data && result.data.id) || '';

          var confirmationHtml =
            '<h3>🌻 Message Sent Successfully!</h3>' +
            '<p>' + escapeHtml(successMsg) + '</p>' +
            '<p>We look forward to connecting with your family. Our team typically responds within 1 to 2 business days to answer questions and coordinate tour times.</p>' +
            (refId ? '<p class="inquiry-id-badge"><strong>Reference ID:</strong> ' + escapeHtml(refId) + '</p>' : '') +
            '<div class="disclaimer-box" style="margin-top: 1rem;"><p><strong>Friendly Reminder:</strong> Scheduling a tour or submitting an inquiry initiates a conversation with our team to discuss program fit and availability. It does not guarantee admission or reserve an open space.</p></div>';

          alertBanner.className = 'alert-banner visible alert-banner-success';
          alertBanner.innerHTML = confirmationHtml;
          alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
          alertBanner.focus();

          form.reset();
          if (window.turnstile && typeof window.turnstile.reset === 'function') {
            try {
              window.turnstile.reset();
            } catch (ignore) {}
          }
        } else {
          var title = 'Submission Review Required';
          var explanatoryMsg = result.message || 'Please correct the highlighted fields and resubmit.';

          if (result.code === 'SENSITIVE_DATA_DETECTED') {
            title = '⚠️ Sensitive Information Detected';
            explanatoryMsg = 'Sunflower Preschool is strictly committed to protecting children\'s privacy. Medical conditions, allergies, medications, and full calendar birthdates cannot be submitted through online inquiry forms. Your entered information has been preserved below so you can adjust it.';
          } else if (result.code === 'SPAM_DETECTED') {
            title = '⚠️ Submission Blocked';
            explanatoryMsg = 'Your message was flagged by our automated security filter. Please remove external links or automated input and try again.';
          } else if (result.code === 'RATE_LIMIT_EXCEEDED') {
            title = '⚠️ Submission Limit Reached';
            explanatoryMsg = 'Too many submissions have been received from this connection. Please wait a few moments before trying again.';
          } else if (result.code === 'TURNSTILE_REQUIRED') {
            title = '⚠️ Verification Required';
            explanatoryMsg = 'Please complete the security verification challenge before submitting your inquiry.';
          }

          renderSummaryAlert(alertBanner, 'error', title, explanatoryMsg, result.errors);
          renderFieldErrors(form, result.errors);

          if (window.turnstile && typeof window.turnstile.reset === 'function') {
            try {
              window.turnstile.reset();
            } catch (ignore) {}
          }
        }
      } catch (err) {
        renderSummaryAlert(
          alertBanner,
          'error',
          'Network Transmission Error',
          'We were unable to connect to our servers to transmit your message. Please check your internet connection and try again. Your information has been preserved below so you do not have to re-enter it.'
        );
        if (window.turnstile && typeof window.turnstile.reset === 'function') {
          try {
            window.turnstile.reset();
          } catch (ignore) {}
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Send Message';
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Sticky Header Elevation on Scroll
  // ---------------------------------------------------------------------------
  function initStickyHeader() {
    var header = document.querySelector('header.site-header');
    if (!header) return;

    var ticking = false;
    function updateHeaderScrolled() {
      if (window.scrollY > 20) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderScrolled);
        ticking = true;
      }
    }, { passive: true });

    // Initial check on load
    updateHeaderScrolled();
  }

  // ---------------------------------------------------------------------------
  // 7. Staggered Scroll-Reveal Animations (IntersectionObserver)
  // ---------------------------------------------------------------------------
  function initScrollReveal() {
    var revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!revealElements.length) return;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      revealElements.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---------------------------------------------------------------------------
  // 8. FAQ Accordion Interaction
  // ---------------------------------------------------------------------------
  function initFaqAccordion() {
    var triggers = document.querySelectorAll('.faq-trigger');
    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        var panelId = trigger.getAttribute('aria-controls');
        var panel = document.getElementById(panelId);

        var nextState = !isExpanded;
        trigger.setAttribute('aria-expanded', nextState ? 'true' : 'false');
        if (panel) {
          if (nextState) {
            panel.removeAttribute('hidden');
            // Force browser layout calculation to ensure smooth expansion transition
            void panel.offsetHeight;
            panel.classList.add('is-open');
          } else {
            panel.classList.remove('is-open');
            // Retain display block during the 350ms transition before applying [hidden]
            setTimeout(function () {
              if (trigger.getAttribute('aria-expanded') === 'false') {
                panel.setAttribute('hidden', '');
              }
            }, 350);
          }
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 9. DOM Initialization
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initStickyHeader();
    initScrollReveal();
    initRoutineTabs();
    initEnrollmentForm();
    initContactForm();
    initFaqAccordion();
  });
})();
