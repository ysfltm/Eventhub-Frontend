import {
  Crown,
  ShieldCheck,
  Gem,
  Mic,
  Megaphone,
  Award,
  BadgeCheck,
  Ticket,
} from 'lucide-react';

/**
 * Role Utility Module for EventHub
 * Standardized PersonRole Enum:
 * Attendee, VIP, Spokesperson, Speaker, Sponsor, Staff, EventOrganiser, SuperAdmin
 */

export const ROLES = {
  ATTENDEE: 'Attendee',
  VIP: 'VIP',
  SPOKESPERSON: 'Spokesperson',
  SPEAKER: 'Speaker',
  SPONSOR: 'Sponsor',
  STAFF: 'Staff',
  EVENT_ORGANISER: 'EventOrganiser',
  SUPER_ADMIN: 'SuperAdmin',
};

export const ALL_ROLES = [
  ROLES.ATTENDEE,
  ROLES.VIP,
  ROLES.SPOKESPERSON,
  ROLES.SPEAKER,
  ROLES.SPONSOR,
  ROLES.STAFF,
  ROLES.EVENT_ORGANISER,
  ROLES.SUPER_ADMIN,
];

/**
 * Normalizes role string variations (e.g., 'Admin' -> 'SuperAdmin', 'EventOrganizer' -> 'EventOrganiser')
 * Strictly returns one of the 8 canonical backend strings:
 * 'Attendee', 'VIP', 'Spokesperson', 'Speaker', 'Sponsor', 'Staff', 'EventOrganiser', 'SuperAdmin'
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr) return ROLES.ATTENDEE;
  const lower = String(roleStr).trim().toLowerCase();

  if (lower.includes('super') || lower === 'admin') return ROLES.SUPER_ADMIN;
  if (lower.includes('organis') || lower.includes('organiz')) return ROLES.EVENT_ORGANISER;
  if (lower === 'vip') return ROLES.VIP;
  if (lower.includes('spokesperson')) return ROLES.SPOKESPERSON;
  if (lower.includes('speaker')) return ROLES.SPEAKER;
  if (lower.includes('sponsor')) return ROLES.SPONSOR;
  if (lower.includes('staff')) return ROLES.STAFF;
  if (lower.includes('participant') || lower.includes('attendee')) return ROLES.ATTENDEE;

  const match = ALL_ROLES.find((r) => r.toLowerCase() === lower);
  return match || ROLES.ATTENDEE;
};

/**
 * Returns color tokens, unique icons, and glassmorphic badge styling for a given role
 */
export const getRoleStyle = (roleInput) => {
  const role = normalizeRole(roleInput);

  switch (role) {
    case ROLES.SUPER_ADMIN:
      return {
        label: 'Super Admin',
        color: '#8b5cf6', // Violet
        badgeClass: 'bg-purple-950/60 border-purple-800/60 text-purple-300',
        dotClass: 'bg-purple-400',
        icon: Crown,
        feedbackBadge: '👑 Super Admin Review',
        feedbackStyle: 'bg-purple-950/80 border-purple-700/80 text-purple-300 shadow-purple-950/50',
      };
    case ROLES.EVENT_ORGANISER:
      return {
        label: 'Event Organiser',
        color: '#3b82f6', // Blue
        badgeClass: 'bg-blue-950/60 border-blue-800/60 text-blue-300',
        dotClass: 'bg-blue-400',
        icon: ShieldCheck,
        feedbackBadge: '⚡ Organiser Feedback',
        feedbackStyle: 'bg-blue-950/80 border-blue-700/80 text-blue-300 shadow-blue-950/50',
      };
    case ROLES.VIP:
      return {
        label: 'VIP Guest',
        color: '#f59e0b', // Amber / Gold
        badgeClass: 'bg-amber-950/60 border-amber-800/60 text-amber-300',
        dotClass: 'bg-amber-400',
        icon: Gem,
        feedbackBadge: '🌟 VIP Guest Feedback',
        feedbackStyle: 'bg-amber-950/90 border-amber-600/80 text-amber-300 shadow-amber-950/50 ring-1 ring-amber-500/30',
      };
    case ROLES.SPEAKER:
      return {
        label: 'Keynote Speaker',
        color: '#10b981', // Emerald
        badgeClass: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300',
        dotClass: 'bg-emerald-400',
        icon: Mic,
        feedbackBadge: '🎙️ Keynote Speaker Review',
        feedbackStyle: 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300 shadow-emerald-950/50',
      };
    case ROLES.SPOKESPERSON:
      return {
        label: 'Spokesperson',
        color: '#06b6d4', // Cyan
        badgeClass: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300',
        dotClass: 'bg-cyan-400',
        icon: Megaphone,
        feedbackBadge: '📢 Spokesperson Review',
        feedbackStyle: 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300 shadow-cyan-950/50',
      };
    case ROLES.SPONSOR:
      return {
        label: 'Sponsor Host',
        color: '#ec4899', // Pink / Magenta
        badgeClass: 'bg-pink-950/60 border-pink-800/60 text-pink-300',
        dotClass: 'bg-pink-400',
        icon: Award,
        feedbackBadge: '💎 Official Sponsor Review',
        feedbackStyle: 'bg-pink-950/90 border-pink-600/80 text-pink-300 shadow-pink-950/50 ring-1 ring-pink-500/30',
      };
    case ROLES.STAFF:
      return {
        label: 'Staff / Crew',
        color: '#6366f1', // Indigo
        badgeClass: 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300',
        dotClass: 'bg-indigo-400',
        icon: BadgeCheck,
        feedbackBadge: '🛠️ Event Staff Report',
        feedbackStyle: 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300 shadow-indigo-950/50',
      };
    case ROLES.ATTENDEE:
    default:
      return {
        label: 'Attendee',
        color: '#94a3b8', // Slate
        badgeClass: 'bg-slate-800/60 border-slate-700/60 text-slate-300',
        dotClass: 'bg-slate-400',
        icon: Ticket,
        feedbackBadge: 'Verified Attendee Review',
        feedbackStyle: 'bg-slate-900 border-slate-800 text-slate-300',
      };
  }
};
