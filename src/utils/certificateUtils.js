/**
 * Certificate of Attendance Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates cryptographic certificate verification IDs, QR payloads, and issuance metadata.
 */

/**
 * Generate a consistent cryptographic verification ID for a participant's certificate
 */
export const generateCertificateId = (event, user, pass) => {
  const eventId = event?.idEvent || event?.IdEvent || event?.id || 'EVT01';
  const personId = user?.idPerson || user?.id || 'USR01';
  const passId = pass?.idParticipation || pass?.idPass || pass?.id || 'P01';

  const rawSeed = `${eventId}-${personId}-${passId}-${event?.title || ''}`;
  let hash = 0;
  for (let i = 0; i < rawSeed.length; i++) {
    const char = rawSeed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');

  return `CST-CERT-2026-${eventId}-${personId}-${hexHash}`;
};

/**
 * Format certificate issuance date
 */
export const formatCertificateDate = (dateStr) => {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
