/**
 * EventHub Security Utilities
 * Provides input sanitization, SQL-injection pattern stripping, and XSS defense helpers
 * for front-end form validation and API parameters.
 */

/**
 * Sanitizes input strings by stripping hazardous SQL control characters and script patterns.
 * Useful for pre-processing search terms and input fields before API dispatch.
 * 
 * @param {string} input - The raw input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove potential SQL injection patterns (quotes, semicolons, comment markers)
    .replace(/['";]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Prevent script tag injection
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

/**
 * Encodes special HTML entities to prevent XSS if string is rendered dynamically.
 * 
 * @param {string} str - Raw string
 * @returns {string} HTML-escaped string
 */
export const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Safely constructs sanitized URL search params object for API calls
 * 
 * @param {Object} paramsObj - Key-value pair of query parameters
 * @returns {Object} Object with sanitized values
 */
export const sanitizeQueryParams = (paramsObj) => {
  if (!paramsObj || typeof paramsObj !== 'object') return {};
  
  const sanitized = {};
  for (const [key, value] of Object.entries(paramsObj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};
