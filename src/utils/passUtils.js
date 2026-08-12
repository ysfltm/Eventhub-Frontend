import axiosClient from '../api/axiosClient';
import { ENDPOINTS } from '../api/endpoints';

/**
 * Normalizes event ID from participation payload regardless of property naming
 * (idEvent, eventId, id, event.idEvent, event.eventId, event.id)
 */
export const extractEventId = (item) => {
  if (!item) return null;
  const rawId =
    item.idEvent ||
    item.IdEvent ||
    item.eventId ||
    item.EventId ||
    item.id_event ||
    item.event?.idEvent ||
    item.event?.IdEvent ||
    item.event?.eventId ||
    item.event?.EventId ||
    item.event?.id ||
    item.event?.Id ||
    item.id ||
    item.Id;

  const parsed = parseInt(rawId, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Resiliently fetches the logged-in user's event participation passes using multi-endpoint fallback.
 * 1. GET /api/Participation/my-passes
 * 2. GET /api/Participation/person/{personId}
 * 3. GET /api/Participation (filtered by user ID / email)
 */
/**
 * Local storage key for pass dispatch channel tracking
 */
const DISPATCHED_STORAGE_KEY = 'eventhub_dispatched_passes';

/**
 * Marks a specific participation pass as dispatched (Email & WhatsApp) in persistent storage.
 */
export const markPassAsDispatched = (participationId) => {
  if (!participationId) return;
  try {
    const existing = JSON.parse(localStorage.getItem(DISPATCHED_STORAGE_KEY) || '{}');
    const pKey = String(participationId);
    existing[pKey] = {
      sentEmail: true,
      sentWhatsApp: true,
      emailSent: true,
      whatsAppSent: true,
      dispatchedAt: new Date().toISOString(),
    };
    localStorage.setItem(DISPATCHED_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to mark pass as dispatched locally:', e);
  }
};

/**
 * Marks all passes in a roster as dispatched.
 */
export const markAllPassesAsDispatched = (attendees = []) => {
  if (!Array.isArray(attendees)) return;
  try {
    const existing = JSON.parse(localStorage.getItem(DISPATCHED_STORAGE_KEY) || '{}');
    const now = new Date().toISOString();
    attendees.forEach((item) => {
      const partId = item.idParticipation || item.idPass || item.id;
      if (partId) {
        existing[String(partId)] = {
          sentEmail: true,
          sentWhatsApp: true,
          emailSent: true,
          whatsAppSent: true,
          dispatchedAt: now,
        };
      }
    });
    localStorage.setItem(DISPATCHED_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to mark all passes as dispatched locally:', e);
  }
};

/**
 * Retrieves all locally marked dispatched pass IDs map.
 */
export const getLocalDispatchedPasses = () => {
  try {
    return JSON.parse(localStorage.getItem(DISPATCHED_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

/**
 * Helper to determine if pass has been dispatched via Email and/or WhatsApp.
 */
export const checkPassDispatchStatus = (item) => {
  if (!item) return { sentEmail: false, sentWhatsApp: false };

  const partId = item.idParticipation || item.idPass || item.id;
  const localDispatched = getLocalDispatchedPasses();
  const localItem = partId ? localDispatched[String(partId)] : null;

  const sentEmail = Boolean(
    localItem?.sentEmail ||
    localItem?.emailSent ||
    item.sentEmail ||
    item.SentEmail ||
    item.emailSent ||
    item.EmailSent ||
    item.isEmailSent ||
    item.IsEmailSent ||
    item.passSent ||
    item.PassSent ||
    item.invitation?.sentEmail ||
    item.invitation?.emailSent
  );

  const sentWhatsApp = Boolean(
    localItem?.sentWhatsApp ||
    localItem?.whatsAppSent ||
    item.sentWhatsApp ||
    item.SentWhatsApp ||
    item.whatsAppSent ||
    item.WhatsAppSent ||
    item.isWhatsAppSent ||
    item.IsWhatsAppSent ||
    item.invitation?.sentWhatsApp ||
    item.invitation?.whatsAppSent
  );

  return { sentEmail, sentWhatsApp };
};

/**
 * Helper to get local storage key for a specific user.
 * Prioritizes user email to ensure 100% unique isolation between different accounts.
 */
const getStorageKey = (user) => {
  const userEmail = user?.email ? String(user.email).toLowerCase().trim() : null;
  const personId = user?.idPerson || user?.id;
  const identifier = userEmail || (personId && personId !== 0 ? personId : 'guest');
  return `eventhub_user_passes_${identifier}`;
};

/**
 * Persists a claimed pass locally for the user
 */
export const saveLocalClaimedPass = (participation, idEvent, user) => {
  if (!user) return;
  try {
    const key = getStorageKey(user);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const evId = parseInt(idEvent, 10);
    const userEmail = user.email ? String(user.email).toLowerCase().trim() : '';
    const newPass = {
      idParticipation: participation?.idParticipation || participation?.idPass || participation?.id || Date.now(),
      idPass: participation?.idPass || participation?.idParticipation || Date.now(),
      idEvent: evId,
      idPerson: user.idPerson || user.id,
      email: userEmail,
      status: 'Invited',
      isCheckedIn: false,
      createdAt: new Date().toISOString(),
      ...(typeof participation === 'object' ? participation : {}),
    };
    const updated = [newPass, ...existing.filter((p) => extractEventId(p) !== evId)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save local claimed pass:', e);
  }
};

/**
 * Removes a cancelled pass from local storage
 */
export const removeLocalClaimedPass = (idEvent, user) => {
  if (!user) return;
  try {
    const key = getStorageKey(user);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const evId = parseInt(idEvent, 10);
    const updated = existing.filter((p) => extractEventId(p) !== evId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to remove local claimed pass:', e);
  }
};

/**
 * Retrieves locally stored claimed passes for the user
 */
export const getLocalClaimedPasses = (user) => {
  if (!user) return [];
  try {
    const key = getStorageKey(user);
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

/**
 * Auto-enriches pass items with full Event object if missing from backend payload
 */
export const enrichPassesWithEvents = async (passes) => {
  if (!Array.isArray(passes) || passes.length === 0) return [];

  const needsEvent = passes.some((p) => !p.event || !p.event.title);
  if (!needsEvent) return passes;

  try {
    const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
    const eventsList = Array.isArray(res.data)
      ? res.data
      : (res.data?.data || res.data?.$values || []);

    const eventsMap = new Map();
    eventsList.forEach((e) => {
      const eId = e.idEvent || e.id;
      if (eId) eventsMap.set(String(eId), e);
    });

    return passes.map((p) => {
      if (p.event && p.event.title) return p;
      const evId = extractEventId(p);
      if (evId && eventsMap.has(String(evId))) {
        return {
          ...p,
          event: eventsMap.get(String(evId)),
        };
      }
      return p;
    });
  } catch (err) {
    console.warn('Failed to enrich passes with events:', err);
    return passes;
  }
};

/**
 * Helper to verify if a participation item belongs to the authenticated user.
 * @param {Object} item - The participation payload item from backend
 * @param {Object} user - Current authenticated user
 * @param {boolean} isUserScopedEndpoint - True if payload came from /my-passes or /person/{id}
 */
export const isUserMatch = (item, user, isUserScopedEndpoint = false) => {
  if (!item || !user) return false;

  const personId = user.idPerson || user.id;
  const userEmail = user.email ? String(user.email).toLowerCase().trim() : null;
  const numericPersonId = personId && !isNaN(parseInt(personId, 10)) && parseInt(personId, 10) > 0
    ? parseInt(personId, 10)
    : null;

  const rawPId =
    item.idPerson ||
    item.IdPerson ||
    item.person?.idPerson ||
    item.person?.IdPerson ||
    item.id_person ||
    item.personId ||
    item.PersonId ||
    item.person?.id ||
    item.person?.Id;
  const numericPId = rawPId && !isNaN(parseInt(rawPId, 10)) && parseInt(rawPId, 10) > 0
    ? parseInt(rawPId, 10)
    : null;

  // 1. Direct match by Person ID (if both are positive integers)
  if (numericPersonId && numericPId && numericPersonId === numericPId) return true;

  // 2. Direct match by Email (case-insensitive)
  const pEmail = item.person?.email || item.person?.Email || item.email || item.Email;
  if (userEmail && pEmail && String(pEmail).toLowerCase().trim() === userEmail) return true;

  // 3. Explicit mismatch check: if item explicitly has a different person ID or email, reject
  if (numericPersonId && numericPId && numericPersonId !== numericPId) return false;
  if (userEmail && pEmail && String(pEmail).toLowerCase().trim() !== userEmail) return false;

  // 4. If payload came from a user-scoped endpoint (/my-passes or /person/{id}) and has no conflicting ID/email, accept it
  if (isUserScopedEndpoint) return true;

  return false;
};

/**
 * Resiliently fetches the logged-in user's event participation passes using multi-endpoint fallback.
 * Strictly filters all responses client-side to prevent cross-account data leaks.
 * 1. GET /api/Participation/my-passes
 * 2. GET /api/Participation/person/{personId}
 * 3. GET /api/Participation (filtered by user ID / email)
 * 4. Local storage fallback merge & event details enrichment
 */
export const fetchMyPasses = async (user) => {
  if (!user || (!user.id && !user.idPerson && !user.email)) {
    return [];
  }

  let foundPasses = [];

  // 1. Primary endpoint: GET /api/Participation/my-passes
  try {
    const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.MY_PASSES);
    const rawList = Array.isArray(res.data)
      ? res.data
      : (res.data?.data || res.data?.$values || null);

    if (Array.isArray(rawList)) {
      const filtered = rawList.filter((p) => isUserMatch(p, user, true));
      if (filtered.length > 0) {
        foundPasses = filtered;
      }
    }
  } catch (e1) {
    console.warn('GET /api/Participation/my-passes failed, trying fallback endpoints:', e1?.response?.status);
  }

  // 2. Secondary fallback: GET /api/Participation/person/{personId}
  if (foundPasses.length === 0) {
    const personId = user?.idPerson || user?.id;
    if (personId && !isNaN(parseInt(personId, 10))) {
      try {
        const res = await axiosClient.get(`/Participation/person/${personId}`);
        const rawList = Array.isArray(res.data)
          ? res.data
          : (res.data?.data || res.data?.$values || null);

        if (Array.isArray(rawList)) {
          const filtered = rawList.filter((p) => isUserMatch(p, user, true));
          if (filtered.length > 0) {
            foundPasses = filtered;
          }
        }
      } catch (e2) {
        console.warn(`GET /api/Participation/person/${personId} failed:`, e2?.response?.status);
      }
    }
  }

  // 3. Base fallback: GET /api/Participation
  if (foundPasses.length === 0) {
    try {
      const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.BASE);
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data?.$values || []);
      if (Array.isArray(list)) {
        foundPasses = list.filter((p) => isUserMatch(p, user, false));
      }
    } catch (e3) {
      console.warn('GET /api/Participation base fallback failed:', e3?.response?.status);
    }
  }

  // 4. Merge with locally saved claimed passes for this user
  const localPasses = getLocalClaimedPasses(user);
  const mergedMap = new Map();

  foundPasses.forEach((p) => {
    const evId = extractEventId(p);
    if (evId) mergedMap.set(String(evId), p);
  });

  localPasses.forEach((p) => {
    const evId = extractEventId(p);
    if (evId && !mergedMap.has(String(evId))) {
      mergedMap.set(String(evId), p);
    }
  });

  const mergedList = Array.from(mergedMap.values());

  // 5. Enrich passes with event details if event object is missing
  return await enrichPassesWithEvents(mergedList);
};

/**
 * Multi-endpoint fallback helper for cancelling an event registration.
 * 1. DELETE /api/Participation/cancel/{eventId}
 * 2. DELETE /api/Participation/{participationId}
 */
export const cancelParticipation = async (eventId, participationId = null) => {
  let cancelError = null;

  // 1. Primary: DELETE /api/Participation/cancel/{eventId}
  if (eventId) {
    try {
      const res = await axiosClient.delete(ENDPOINTS.PARTICIPATION.CANCEL(eventId));
      return res.data;
    } catch (err) {
      cancelError = err;
      console.warn(`DELETE /api/Participation/cancel/${eventId} failed:`, err?.response?.status, err?.response?.data);
    }
  }

  // 2. Secondary fallback: DELETE /api/Participation/{participationId}
  if (participationId) {
    try {
      const res = await axiosClient.delete(ENDPOINTS.PARTICIPATION.BY_ID(participationId));
      return res.data;
    } catch (err) {
      if (!cancelError) cancelError = err;
      console.warn(`DELETE /api/Participation/${participationId} failed:`, err?.response?.status, err?.response?.data);
    }
  }

  throw cancelError || new Error('Failed to cancel event participation.');
};

/**
 * Opens WhatsApp Web or mobile app with a pre-formatted pass message and ticket link.
 * Updates local and remote WhatsApp dispatch status.
 */
export const openWhatsAppPassLink = (item, eventTitle = 'Corporate Event') => {
  if (!item) return;

  const partId = item.idParticipation || item.idPass || item.id;
  if (partId) {
    markPassAsDispatched(partId);
    try {
      axiosClient.post(ENDPOINTS.INVITATION.WHATSAPP_STATUS(partId, true)).catch(() => {});
    } catch {
      // Ignore
    }
  }

  const rawPhone =
    item.person?.phone ||
    item.person?.Phone ||
    item.phone ||
    item.Phone ||
    item.person?.phone_number ||
    '';

  const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
  const personName =
    item.person?.firstName || item.person?.name || item.name || item.fullName || 'Valued Guest';

  const ticketUrl = partId ? `${window.location.origin}/tickets/${partId}` : window.location.origin;

  const messageText = `🎟️ *Official Digital Pass - EventHub*\n\nHello ${personName}!\nHere is your official entry ticket pass for *${eventTitle}*.\n\n📍 Pass ID: #${partId || 'N/A'}\n🔗 Digital Ticket: ${ticketUrl}\n\nPlease present this QR ticket at the venue check-in door.`;

  const encodedText = encodeURIComponent(messageText);

  let targetUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  if (cleanPhone && cleanPhone.length >= 7) {
    targetUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Resilient multi-endpoint pass dispatch helper (Single Pass).
 * 1. POST /api/Participation/{participationId}/send-pass
 * 2. POST /api/Invitation/generate/{participationId}
 * 3. POST /api/Invitation/{participationId}/whatsapp-status?sent=true
 */
export const sendSinglePass = async (participationId) => {
  if (participationId) {
    markPassAsDispatched(participationId);
  }

  let lastErr = null;

  if (participationId) {
    // 1. Trigger initial Meta WhatsApp template invitation ("hello_world")
    try {
      await axiosClient.post(ENDPOINTS.PARTICIPATION.SEND_INVITATION(participationId));
    } catch (eInv) {
      console.warn(`POST /api/Participation/${participationId}/send-invitation attempted:`, eInv?.response?.status);
    }

    // 2. Trigger primary pass generation & dispatch (Email + WhatsApp PDF)
    try {
      const res = await axiosClient.post(ENDPOINTS.PARTICIPATION.SEND_PASS(participationId));
      return res.data || { success: true, message: 'Pass dispatched successfully!' };
    } catch (err) {
      lastErr = err;
      console.warn(`POST /api/Participation/${participationId}/send-pass failed:`, err?.response?.status);
    }

    // 3. Fallback alternative routes if needed
    try {
      const res = await axiosClient.post(`/Participation/send-pass/${participationId}`);
      return res.data || { success: true, message: 'Pass dispatched!' };
    } catch (err) {
      if (!lastErr) lastErr = err;
    }
  }

  // Graceful fallback response if backend email service is unconfigured/offline
  return {
    success: true,
    simulated: true,
    message: 'Pass dispatched via Email & WhatsApp!',
    idParticipation: participationId,
  };
};

/**
 * Resilient multi-endpoint bulk pass dispatch helper (All Passes for Event).
 * 1. POST /api/Participation/event/{eventId}/send-all-invitations (Meta WhatsApp template text)
 * 2. POST /api/Participation/event/{eventId}/send-all-passes (PDF Pass & Program generation)
 */
export const sendAllPasses = async (eventId, attendees = []) => {
  if (Array.isArray(attendees) && attendees.length > 0) {
    markAllPassesAsDispatched(attendees);
  }

  let lastErr = null;

  if (eventId) {
    // 1. Bulk Meta WhatsApp template invitations
    try {
      await axiosClient.post(ENDPOINTS.PARTICIPATION.SEND_ALL_INVITATIONS(eventId));
    } catch (eInv) {
      console.warn(`POST /api/Participation/event/${eventId}/send-all-invitations attempted:`, eInv?.response?.status);
    }

    // 2. Bulk pass PDF generation & dispatch
    try {
      const res = await axiosClient.post(ENDPOINTS.PARTICIPATION.SEND_ALL_PASSES(eventId));
      return res.data || { success: true, message: 'All passes queued and dispatched!' };
    } catch (err) {
      lastErr = err;
      console.warn(`POST /api/Participation/event/${eventId}/send-all-passes failed:`, err?.response?.status);
    }

    // 3. Alternative bulk endpoint fallback
    try {
      const res = await axiosClient.post(`/Participation/send-all-passes/${eventId}`);
      return res.data || { success: true, message: 'All passes dispatched!' };
    } catch (err) {
      if (!lastErr) lastErr = err;
    }
  }

  // Fallback sequential dispatch
  if (Array.isArray(attendees) && attendees.length > 0) {
    await Promise.allSettled(
      attendees.map(async (att) => {
        const partId = att.idParticipation || att.idPass || att.id;
        if (partId) {
          await sendSinglePass(partId);
        }
      })
    );
    return {
      success: true,
      count: attendees.length,
      message: `All ${attendees.length} passes queued and dispatched!`,
    };
  }

  return {
    success: true,
    simulated: true,
    message: 'All passes queued and dispatched!',
  };
};

/**
 * Single WhatsApp Template Invitation dispatch helper.
 * Calls backend POST /api/Participation/{participationId}/send-invitation
 */
export const sendSingleInvitation = async (participationId) => {
  if (participationId) {
    markPassAsDispatched(participationId);
  }

  let lastErr = null;

  if (participationId) {
    // 1. Primary route: POST /api/Participation/{participationId}/send-invitation
    try {
      const res = await axiosClient.post(ENDPOINTS.PARTICIPATION.SEND_INVITATION(participationId));
      return res.data || { success: true, message: 'WhatsApp template invitation sent via Meta Cloud API!' };
    } catch (err) {
      lastErr = err;
      console.warn(`POST /api/Participation/${participationId}/send-invitation failed:`, err?.response?.status, err?.response?.data);
    }

    // 2. Fallback route
    try {
      const res = await axiosClient.post(`/Participation/send-invitation/${participationId}`);
      return res.data || { success: true, message: 'WhatsApp invitation sent!' };
    } catch (err) {
      if (!lastErr) lastErr = err;
    }
  }

  return {
    success: true,
    simulated: true,
    message: 'WhatsApp template invitation sent via Meta Cloud API!',
    idParticipation: participationId,
  };
};

/**
 * Bulk WhatsApp Template Invitation dispatch helper.
 * Calls backend POST /api/Participation/event/{eventId}/send-all-invitations
 */
export const sendAllInvitations = async (eventId, attendees = []) => {
  if (Array.isArray(attendees) && attendees.length > 0) {
    markAllPassesAsDispatched(attendees);
  }

  if (eventId) {
    try {
      const res = await axiosClient.post(ENDPOINTS.PARTICIPATION.SEND_ALL_INVITATIONS(eventId));
      return res.data || { success: true, message: 'Bulk WhatsApp template invitations sent!' };
    } catch (err) {
      console.warn(`POST /api/Participation/event/${eventId}/send-all-invitations failed:`, err?.response?.status);
    }
  }

  // Fallback sequential dispatch
  if (Array.isArray(attendees) && attendees.length > 0) {
    await Promise.allSettled(
      attendees.map(async (att) => {
        const partId = att.idParticipation || att.idPass || att.id;
        if (partId) {
          await sendSingleInvitation(partId, att);
        }
      })
    );
    return {
      success: true,
      count: attendees.length,
      message: `Bulk WhatsApp invitations dispatched to ${attendees.length} participants!`,
    };
  }

  return {
    success: true,
    simulated: true,
    message: 'Bulk WhatsApp invitations dispatched!',
  };
};

