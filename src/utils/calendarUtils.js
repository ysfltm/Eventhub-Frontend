/**
 * Calendar Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates direct URLs and RFC 5545 compliant .ics files for calendar sync
 * Supports: Google Calendar, Outlook / Office 365, Apple Calendar (iCal .ics), Yahoo
 */

/**
 * Format a Date object into UTC iCalendar timestamp: YYYYMMDDTHHmmssZ
 */
const formatIcsDate = (date) => {
  if (!date || isNaN(date.getTime())) {
    date = new Date();
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Parses event date and time strings into start & end Date objects
 */
export const getEventDateRange = (event) => {
  if (!event) return { startDate: new Date(), endDate: new Date(Date.now() + 3600000) };

  const rawDate = event.date || event.Date || new Date().toISOString();
  const dateOnly = String(rawDate).split('T')[0];

  const startTimeStr = (event.startTime || event.StartTime || '09:00:00').substring(0, 5);
  const endTimeStr = (event.endTime || event.EndTime || '').substring(0, 5);

  const [startH, startM] = startTimeStr.split(':').map((n) => parseInt(n, 10) || 0);
  const startDate = new Date(`${dateOnly}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);

  let endDate;
  if (endTimeStr && endTimeStr.includes(':')) {
    const [endH, endM] = endTimeStr.split(':').map((n) => parseInt(n, 10) || 0);
    endDate = new Date(`${dateOnly}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    if (endDate <= startDate) {
      // Default to 1 hour after start if end time is before or equal
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
  } else {
    // Default 2-hour session
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
};

/**
 * Generate Google Calendar Web Add Event Link
 */
export const generateGoogleCalendarUrl = (event) => {
  const { startDate, endDate } = getEventDateRange(event);
  const startUtc = formatIcsDate(startDate);
  const endUtc = formatIcsDate(endDate);

  const title = event?.title || event?.Title || 'EventHub Corporate Session';
  const description = `${event?.description || event?.Description || ''}\n\nManaged via EventHub Corporate Portal.`;
  const location = event?.address || event?.Address || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: description,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Outlook Live / Office 365 Web Add Event Link
 */
export const generateOutlookCalendarUrl = (event) => {
  const { startDate, endDate } = getEventDateRange(event);
  const title = event?.title || event?.Title || 'EventHub Corporate Session';
  const description = `${event?.description || event?.Description || ''}\n\nManaged via EventHub Corporate Portal.`;
  const location = event?.address || event?.Address || '';

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: description,
    location: location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Generate Yahoo Calendar Web Link
 */
export const generateYahooCalendarUrl = (event) => {
  const { startDate, endDate } = getEventDateRange(event);
  const startUtc = formatIcsDate(startDate);
  const endUtc = formatIcsDate(endDate);

  const title = event?.title || event?.Title || 'EventHub Corporate Session';
  const description = `${event?.description || event?.Description || ''}\n\nManaged via EventHub Corporate Portal.`;
  const location = event?.address || event?.Address || '';

  const params = new URLSearchParams({
    v: '60',
    title: title,
    st: startUtc,
    et: endUtc,
    desc: description,
    in_loc: location,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
};

/**
 * Generate and trigger download of an RFC 5545 standard .ics file
 * Compatible with Apple Calendar, iCal, Outlook Desktop, and Google Calendar Import.
 */
export const downloadIcsFile = (event) => {
  const { startDate, endDate } = getEventDateRange(event);
  const startUtc = formatIcsDate(startDate);
  const endUtc = formatIcsDate(endDate);
  const nowUtc = formatIcsDate(new Date());

  const eventId = event?.idEvent || event?.IdEvent || event?.id || Date.now();
  const title = (event?.title || event?.Title || 'EventHub Corporate Session').replace(/[\\,;]/g, (match) => `\\${match}`);
  const description = (event?.description || event?.Description || 'Corporate Session on EventHub')
    .replace(/\n/g, '\\n')
    .replace(/[\\,;]/g, (match) => `\\${match}`);
  const location = (event?.address || event?.Address || '').replace(/[\\,;]/g, (match) => `\\${match}`);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventHub//Event Management System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:eventhub-${eventId}-${Date.now()}@eventhub.app`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const filename = `${(event?.title || 'event').toLowerCase().replace(/[^a-z0-9]/g, '_')}_schedule.ics`;

  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};
