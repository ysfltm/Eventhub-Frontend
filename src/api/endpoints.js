export const ENDPOINTS = {
  // Auth & Profile
  AUTH: {
    LOGIN: '/Auth/login',
    REGISTER: '/Auth/register',
    FORGOT_PASSWORD: '/Auth/forgot-password',
    RESET_PASSWORD: '/Auth/reset-password',
    CHANGE_PASSWORD: '/Auth/change-password',
  },
  // People (Person Entity)
  PERSON: {
    BASE: '/Person',
    BY_ID: (id) => `/Person/${id}`,
  },
  // Companies
  COMPANY: {
    BASE: '/Company',
    BY_ID: (id) => `/Company/${id}`,
  },
  // Events
  EVENT: {
    BASE: '/Event',
    BY_ID: (id) => `/Event/${id}`,
    UPLOAD_PROGRAM: (id) => `/Event/${id}/upload-program`,
    GENERATE_PROGRAM: (id) => `/Event/${id}/generate-program`,
  },
  // Participations & Ticketing
  PARTICIPATION: {
    BASE: '/Participation',
    BY_ID: (id) => `/Participation/${id}`,
    BY_EVENT: (eventId) => `/Participation/event/${eventId}`,
    CHECK_IN: '/Participation/check-in',
    SEND_PASS: (participationId) => `/Participation/${participationId}/send-pass`,
    SEND_ALL_PASSES: (eventId) => `/Participation/event/${eventId}/send-all-passes`,
    SEND_INVITATION: (participationId) => `/Participation/${participationId}/send-invitation`,
    SEND_ALL_INVITATIONS: (eventId) => `/Participation/event/${eventId}/send-all-invitations`,
    MY_PASSES: '/Participation/my-passes',
    CANCEL: (eventId) => `/Participation/cancel/${eventId}`,
  },
  // Digital Pass & Invitation Engine
  INVITATION: {
    GENERATE: (participationId) => `/Invitation/generate/${participationId}`,
    BY_PARTICIPATION: (participationId) => `/Invitation/participation/${participationId}`,
    EMAIL_STATUS: (invitationId, sent = true) => `/Invitation/${invitationId}/email-status?sent=${sent}`,
    WHATSAPP_STATUS: (invitationId, sent = true) => `/Invitation/${invitationId}/whatsapp-status?sent=${sent}`,
  },
  // Event & Platform Analytics
  ANALYTICS: {
    EVENT: (eventId) => `/Analytics/event/${eventId}`,
    OVERVIEW: '/Analytics/overview',
  },
  // Feedback & Ratings
  FEEDBACK: {
    BASE: '/Feedback',
    BY_EVENT: (eventId) => `/Feedback/event/${eventId}`,
    EVENT_SUMMARY: (eventId) => `/Feedback/event/${eventId}/summary`,
    BY_ID: (id) => `/Feedback/${id}`,
  },
};