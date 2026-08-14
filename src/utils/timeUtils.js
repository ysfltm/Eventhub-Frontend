/**
 * Converts any time string (12-hour AM/PM or 24-hour HH:mm) into strict C# TimeSpan 24-hour string format ("HH:mm:ss").
 * e.g., "02:03 PM" -> "14:03:00"
 * e.g., "11:03 AM" -> "11:03:00"
 * e.g., "09:00"    -> "09:00:00"
 * e.g., "14:30:00" -> "14:30:00"
 */
export const to24HourTimeSpan = (timeStr) => {
  if (!timeStr) return '09:00:00';

  const str = String(timeStr).trim();

  // Match 12-hour AM/PM format (e.g. "02:03 PM", "11:03 AM")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const seconds = ampmMatch[3] || '00';
    const period = ampmMatch[4].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}:${minutes}:${seconds}`;
  }

  // Match 24-hour HH:mm or HH:mm:ss format
  const parts = str.split(':');
  if (parts.length >= 2) {
    const hh = String(Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0))).padStart(2, '0');
    const mm = String(Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0))).padStart(2, '0');
    const ss = parts[2] ? String(Math.min(59, Math.max(0, parseInt(parts[2], 10) || 0))).padStart(2, '0') : '00';
    return `${hh}:${mm}:${ss}`;
  }

  return '09:00:00';
};

/**
 * Generates 24-hour time options ("00:00" through "23:30" in 30-minute intervals) for clean dropdown selectors.
 */
export const TIME_OPTIONS_24H = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours}:${minutes}`;
});

/**
 * Checks if an event's date and start time is in the past.
 * @param {string|Date} dateStr - The ISO date string or Date object.
 * @param {string} startTimeStr - The start time string (e.g. "09:00", "09:00:00").
 * @returns {boolean} true if the event date + start time has already passed.
 */
export const isEventPassed = (dateStr, startTimeStr) => {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    if (startTimeStr) {
      const cleanTime = String(startTimeStr).trim();
      const parts = cleanTime.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        d.setHours(hours, minutes, 0, 0);
      }
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d.getTime() < Date.now();
  } catch {
    return false;
  }
};

/**
 * Formats any date string/ISO date into "YYYY-MM-DD" suitable for HTML5 date inputs.
 * @param {string|Date} dateStr 
 * @returns {string} Formatted "YYYY-MM-DD" string or empty string
 */
export const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

