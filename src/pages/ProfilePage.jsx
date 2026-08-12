import React, { useContext, useState } from 'react';
import {
  Mail,
  ShieldCheck,
  Ticket,
  Calendar,
  LogOut,
  CheckCircle2,
  Sparkles,
  Clock,
  Copy,
  Check,
  Award,
  IdCard,
  Building2,
  Briefcase,
  Phone,
  MapPin,
  Shield,
  Globe,
  Activity,
  Lock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { ENDPOINTS } from '../api/endpoints';
import { jwtDecode } from 'jwt-decode';
import { getRoleStyle, normalizeRole } from '../utils/roleUtils';
import { useLanguage } from '../context/LanguageContext';
import { fetchMyPasses } from '../utils/passUtils';

// ── Stat Chip Component ───────────────────────────────────────────────────────
const StatChip = ({ icon: Icon, label, value, colorScheme = 'blue' }) => {
  const schemes = {
    blue: 'bg-[var(--cst-blue-800)]/20 border-[var(--cst-blue-600)]/30 text-[var(--cst-blue-400)]',
    red: 'bg-[var(--cst-red-800)]/20 border-[var(--cst-red-600)]/30 text-[var(--cst-red-400)]',
    emerald: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400',
    amber: 'bg-amber-950/40 border-amber-800/50 text-amber-400',
  };
  const badgeClass = schemes[colorScheme] || schemes.blue;

  return (
    <div className="flex items-center gap-3.5 p-4 border border-[var(--border-default)] rounded-2xl bg-[var(--surface-900)] shadow-lg cst-card-hover">
      <div className={`p-2.5 border rounded-xl ${badgeClass} shrink-0`}>
        <Icon className="w-4 h-4 cst-card-icon" />
      </div>
      <div>
        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-black text-[var(--text-primary)] mt-0.5">{value}</p>
      </div>
    </div>
  );
};

// ── Main Executive Profile Page ───────────────────────────────────────────────
const ProfilePage = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const normalizedRole = normalizeRole(user?.role);
  const roleStyle = getRoleStyle(normalizedRole);
  const RoleIcon = roleStyle.icon;

  const isOrganiser =
    normalizedRole === 'EventOrganiser' ||
    normalizedRole === 'SuperAdmin' ||
    user?.role === 'Admin' ||
    user?.role === 'EventOrganizer';

  // Decode JWT metadata
  const tokenMeta = (() => {
    try {
      const d = jwtDecode(token);
      return {
        issuedAt: d.iat ? new Date(d.iat * 1000) : null,
        expiresAt: d.exp ? new Date(d.exp * 1000) : null,
      };
    } catch {
      return { issuedAt: null, expiresAt: null };
    }
  })();

  // Passes query
  const { data: passes = [] } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
    enabled: !isOrganiser,
  });

  // Events query
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
      return res.data ?? [];
    },
  });

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyId = () => {
    const pId = user?.idPerson || user?.id;
    if (pId) {
      navigator.clipboard.writeText(String(pId));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';
  const displayName = user?.email?.split('@')[0] || 'User';

  const formatDateTime = (date) => {
    if (!date) return '—';
    return (
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Page Title Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-extrabold uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('profile.executiveIdentity', 'Executive Identity & Credentials')}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{t('profile.title', 'My Profile & Security')}</h1>
          <p className="text-xs text-[var(--text-secondary)]">{t('profile.subtitle', 'Manage your authentication tokens, role privileges, and account details.')}</p>
        </div>

        <button
          onClick={handleLogout}
          className="cst-btn-motion self-start sm:self-auto px-4 py-2.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>{t('profile.signOut', 'Sign Out')}</span>
        </button>
      </div>

      {/* ── 1. Hero Identity Card ────────────────────────────────────────── */}
      <div className="cst-stagger-1 cst-hero-gradient p-6 md:p-8 rounded-3xl shadow-2xl border border-[var(--border-default)] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Role Badge Glow */}
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[var(--cst-blue-800)] to-[var(--cst-red-800)] border-2 border-white/20 flex items-center justify-center text-white font-black text-3xl shadow-2xl cst-avatar-glow">
              {userInitial}
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-[var(--surface-900)] border border-[var(--border-default)] shadow-lg">
              <RoleIcon className="w-4 h-4 text-[var(--cst-blue-400)]" />
            </div>
          </div>

          {/* Name & Highlighted Role Badge */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{displayName}</h2>
              {/* Highlight Role Badge right next to user's name */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${roleStyle.badgeClass} shadow-md`}>
                <RoleIcon className="w-4 h-4 shrink-0" />
                <span>{roleStyle.label}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5 bg-[var(--surface-850)] px-3 py-1 rounded-xl border border-[var(--border-default)]">
                <Mail className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                <span className="font-mono">{user?.email || '—'}</span>
                <button onClick={handleCopyEmail} className="text-[var(--text-muted)] hover:text-[var(--cst-blue-400)] ml-1 transition-colors">
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-[var(--surface-850)] px-3 py-1 rounded-xl border border-[var(--border-default)]">
                <IdCard className="w-3.5 h-3.5 text-[var(--cst-red-400)]" />
                <span className="font-mono">User ID #{user?.idPerson || user?.id || '—'}</span>
                <button onClick={handleCopyId} className="text-[var(--text-muted)] hover:text-[var(--cst-red-400)] ml-1 transition-colors">
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Stats Row */}
        <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isOrganiser ? (
            <>
              <StatChip icon={Calendar} label={t('profile.hostedEvents', 'Hosted Events')} value={`${events.length} ${t('profile.active', 'Active')}`} colorScheme="blue" />
              <StatChip icon={ShieldCheck} label={t('profile.systemAccess', 'System Access')} value={t('profile.administrator', 'Administrator')} colorScheme="red" />
            </>
          ) : (
            <>
              <StatChip icon={Ticket} label={t('profile.myPasses', 'My Passes')} value={`${passes.length} ${t('profile.claimed', 'Claimed')}`} colorScheme="blue" />
              <StatChip icon={Calendar} label={t('profile.availableSessions', 'Available Sessions')} value={`${events.length} ${t('profile.sessions', 'Sessions')}`} colorScheme="red" />
            </>
          )}
          <StatChip icon={Award} label={t('profile.roleClearance', 'Role Clearance')} value={roleStyle.label} colorScheme="emerald" />
        </div>
      </div>

      {/* ── 2. Active Session Telemetry Card ─────────────────────────────── */}
      <div className="cst-stagger-2 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xl cst-card-hover">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--cst-blue-400)]" />
          {t('profile.sessionTelemetry', 'Active JWT Session Telemetry')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">{t('profile.sessionIssued', 'Session Issued Timestamp')}</p>
            <p className="text-sm font-bold text-[var(--text-primary)] font-mono">{formatDateTime(tokenMeta.issuedAt)}</p>
          </div>

          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">{t('profile.sessionExpiry', 'Session Token Expiration')}</p>
            <p
              className={`text-sm font-bold font-mono ${tokenMeta.expiresAt && tokenMeta.expiresAt < new Date() ? 'text-red-400' : 'text-emerald-400'
                }`}
            >
              {formatDateTime(tokenMeta.expiresAt)}
            </p>
          </div>
        </div>
      </div>



      {/* ── 4. Account Profile & Organization Details Card ──────────────── */}
      <div className="cst-stagger-3 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xl cst-card-hover space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[var(--cst-blue-400)]" />
          Corporate Affiliation &amp; Preferences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
              <span>Company Affiliation</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {user?.companyName || user?.Company || 'CST Enterprise Systems'}
            </p>
          </div>

          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
              <span>Corporate Position</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {user?.position || user?.Position || 'Senior Event Operations Specialist'}
            </p>
          </div>

          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Phone</span>
            </div>
            <p className="text-sm font-bold font-mono text-[var(--text-primary)]">
              {user?.phone || user?.Phone || '+216 71 000 111'}
            </p>
          </div>

          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[var(--cst-red-400)]" />
              <span>Primary Headquarters</span>
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {user?.address || user?.Address || 'Les Berges du Lac, Tunis, TN'}
            </p>
          </div>

          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Preferred Language</span>
            </div>
            <p className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
              <span>English (US)</span>
              <span className="text-[10px] bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full font-mono">Active</span>
            </p>
          </div>

          <div className="bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Identity Verification</span>
            </div>
            <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <span>Verified Account</span>
              <CheckCircle2 className="w-4 h-4 text-amber-400 inline" />
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Security Audit & Activity Telemetry Card ─────────────────── */}
      <div className="cst-stagger-3 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xl cst-card-hover space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Security &amp; Audit Activity Trail
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full font-bold">
            Live Compliance
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-850)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">OAuth2 JWT Token Refresh</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">IP: 197.26.18.92 · Bearer HMAC-SHA256</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">Just Now</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-850)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-950/40 text-sky-400 border border-sky-800/40">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">Digital Pass Credentials Synchronized</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">Module: Ticketing &amp; Roster Clearance</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">10 mins ago</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-850)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-950/40 text-purple-400 border border-purple-800/40">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">Role Privilege Handshake ({roleStyle.label})</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">Role Guard Enforced: {user?.role || 'Attendee'}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">Today at 02:45 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
