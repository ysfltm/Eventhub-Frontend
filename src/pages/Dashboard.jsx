import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Ticket,
  QrCode,
  PlusCircle,
  Users,
  ArrowUpRight,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { ENDPOINTS } from '../api/endpoints';
import { fetchMyPasses } from '../utils/passUtils';
import { getRoleStyle, normalizeRole } from '../utils/roleUtils';
import { useLanguage } from '../context/LanguageContext';
import { AddToCalendarDropdown } from '../components/events/AddToCalendarDropdown';

// ── Reusable Stat Card Component ─────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, subtext, colorScheme = 'blue' }) => {
  const schemes = {
    blue: {
      border: 'hover:border-[var(--cst-blue-600)]/60',
      badge: 'bg-[var(--cst-blue-800)]/20 text-[var(--cst-blue-400)] border-[var(--cst-blue-600)]/30',
      bar: 'bg-[var(--cst-blue-600)]',
      icon: 'text-[var(--cst-blue-400)]',
    },
    red: {
      border: 'hover:border-[var(--cst-red-600)]/60',
      badge: 'bg-[var(--cst-red-800)]/20 text-[var(--cst-red-400)] border-[var(--cst-red-600)]/30',
      bar: 'bg-[var(--cst-red-600)]',
      icon: 'text-[var(--cst-red-400)]',
    },
    emerald: {
      border: 'hover:border-emerald-600/60',
      badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50',
      bar: 'bg-emerald-500',
      icon: 'text-emerald-400',
    },
    amber: {
      border: 'hover:border-amber-600/60',
      badge: 'bg-amber-950/40 text-amber-400 border-amber-800/50',
      bar: 'bg-amber-500',
      icon: 'text-amber-400',
    },
  };
  const s = schemes[colorScheme] || schemes.blue;

  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] ${s.border} p-5 rounded-3xl shadow-xl cst-card-hover relative overflow-hidden transition-all group`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${s.bar}`} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <div className={`p-2.5 rounded-2xl border ${s.badge}`}>
          <Icon className={`w-5 h-5 ${s.icon} cst-card-icon`} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{value}</p>
        {subtext && (
          <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-[var(--cst-blue-400)] shrink-0" /> {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Skeleton Shimmer for Loading State ───────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 rounded-3xl space-y-3 animate-pulse">
    <div className="h-3 w-1/3 bg-slate-800/60 rounded" />
    <div className="h-6 w-2/3 bg-slate-800/60 rounded" />
    <div className="h-3 w-full bg-slate-800/40 rounded" />
    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
      <div className="h-3 w-1/2 bg-slate-800/40 rounded" />
    </div>
  </div>
);

// ── Main Dashboard Overview Page ─────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const normalizedRole = normalizeRole(user?.role);
  const roleStyle = getRoleStyle(normalizedRole);
  const RoleIcon = roleStyle.icon;

  const isOrganiser =
    normalizedRole === 'EventOrganiser' ||
    normalizedRole === 'SuperAdmin' ||
    user?.role === 'Admin' ||
    user?.role === 'EventOrganizer';
  const isSuperAdmin = normalizedRole === 'SuperAdmin';
  const userCompanyId = !isSuperAdmin && (user?.idCompany || user?.companyId) ? (user.idCompany || user.companyId) : null;

  // 1. Events query
  const {
    data: rawEvents = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
      return res.data ?? [];
    },
  });

  const rawEventsList = Array.isArray(rawEvents)
    ? rawEvents
    : Array.isArray(rawEvents?.data)
    ? rawEvents.data
    : Array.isArray(rawEvents?.$values)
    ? rawEvents.$values
    : [];

  const events = rawEventsList.filter((evt) => {
    if (!evt) return false;
    if (userCompanyId) {
      const evtCompId = evt.idCompany || evt.IdCompany || evt.company?.idCompany || evt.company?.IdCompany;
      if (evtCompId && String(evtCompId) !== String(userCompanyId)) {
        return false;
      }
    }
    return true;
  });

  // 2. Fetch pass count for attendees
  const { data: myPasses = [] } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
    enabled: !isOrganiser,
  });

  // 3. Fetch platform analytics for organisers
  const { data: analytics } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.ANALYTICS.OVERVIEW);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: isOrganiser,
  });

  const displayName = user?.email?.split('@')[0] || 'User';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── Captivating CST Red & Blue Hero Banner ──────────────────────────── */}
      <div className="cst-stagger-1 cst-hero-gradient p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Glow Accent Circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--cst-blue-700)]/20" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--cst-red-700)]/20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Top Brand Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="cst-badge-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                {t('dashboard.cstEnterprise', 'CST Enterprise')}
              </span>
              <span className="cst-badge-red px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('dashboard.liveSystem', 'Live System Active')}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${roleStyle.badgeClass}`}>
                <RoleIcon className="w-3.5 h-3.5" />
                {roleStyle.label}
              </span>
            </div>

            {/* Hero Greeting */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
                {t('dashboard.welcomeBack', 'Welcome back,')} <span className="bg-gradient-to-r from-[var(--cst-blue-400)] via-[var(--cst-blue-500)] to-[var(--cst-red-400)] bg-clip-text text-transparent">{displayName}</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleStyle.badgeClass} shadow-md align-middle`}>
                <RoleIcon className="w-4 h-4 shrink-0" />
                <span>{roleStyle.label}</span>
              </span>
            </div>

            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              {isOrganiser
                ? t('dashboard.organiserSubtitle', 'Manage corporate session rosters, publish events, monitor door arrival velocity, and manage user privilege roles.')
                : t('dashboard.attendeeSubtitle', 'Discover upcoming corporate sessions, view your high-contrast QR entry passes, and manage your session agenda.')}
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {isOrganiser ? (
              <>
                <Link to="/events/new">
                  <button className="cst-btn-motion bg-gradient-to-r from-[var(--cst-blue-700)] to-[var(--cst-blue-600)] hover:from-[var(--cst-blue-600)] hover:to-[var(--cst-blue-500)] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-[rgba(29,86,182,0.3)] flex items-center gap-2 cursor-pointer">
                    <PlusCircle className="w-4 h-4 text-white" />
                    <span>{t('dashboard.publishNewEvent', 'Publish New Event')}</span>
                  </button>
                </Link>
                <Link to="/admin/users">
                  <button className="cst-btn-motion bg-gradient-to-r from-[var(--cst-red-700)] to-[var(--cst-red-600)] hover:from-[var(--cst-red-600)] hover:to-[var(--cst-red-500)] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-[rgba(181,31,36,0.3)] flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4 text-white" />
                    <span>{t('dashboard.userRoster', 'User Roster')}</span>
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/events">
                  <button className="cst-btn-motion bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-[rgba(29,86,182,0.3)] flex items-center gap-2 cursor-pointer">
                    <Calendar className="w-4 h-4 text-white" />
                    <span>{t('dashboard.browseEvents', 'Browse Events')}</span>
                  </button>
                </Link>
                <Link to="/passes">
                  <button className="cst-btn-motion bg-[var(--surface-800)] hover:bg-[var(--surface-700)] text-[var(--text-primary)] border border-[var(--border-default)] px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer">
                    <Ticket className="w-4 h-4 text-[var(--cst-blue-400)]" />
                    <span>{t('dashboard.myDigitalPasses', 'My Digital Passes')}</span>
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── High-Contrast Red & Blue Performance Scorecards ──────────────────── */}
      <div className="cst-stagger-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isOrganiser ? (
          <>
            <StatCard
              label={t('dashboard.totalHostedEvents', 'Total Hosted Events')}
              value={isLoading ? '—' : (analytics?.totalEvents ?? events.length)}
              icon={Calendar}
              subtext={t('dashboard.eventsRegistered', 'Events registered in engine')}
              colorScheme="blue"
            />
            <StatCard
              label={t('dashboard.userManagementRoster', 'User Management Roster')}
              value={t('dashboard.roles8', '8 Roles')}
              icon={Users}
              subtext={t('dashboard.adminRoleControls', 'SuperAdmin & Role controls')}
              colorScheme="red"
            />
            <StatCard
              label={t('dashboard.doorCheckInVelocity', 'Door Check-In Velocity')}
              value={analytics?.globalAttendanceRatePercentage ? `${analytics.globalAttendanceRatePercentage}%` : 'Live'}
              icon={QrCode}
              subtext={t('dashboard.opticalQrScanner', 'Optical QR turnstile scanner')}
              colorScheme="emerald"
            />
            <StatCard
              label={t('dashboard.executiveAnalytics', 'Executive Analytics')}
              value={analytics?.totalParticipations ? `${analytics.totalParticipations}` : 'Real-Time'}
              icon={TrendingUp}
              subtext={t('dashboard.roleBreakdown', 'Role breakdown & rating scores')}
              colorScheme="amber"
            />
          </>
        ) : (
          <>
            <StatCard
              label={t('dashboard.myActivePasses', 'My Active Passes')}
              value={myPasses.length}
              icon={Ticket}
              subtext={t('dashboard.qrReady', 'QR codes ready for scan')}
              colorScheme="blue"
            />
            <StatCard
              label={t('dashboard.availableSessions', 'Available Sessions')}
              value={isLoading ? '—' : events.length}
              icon={Calendar}
              subtext={t('dashboard.openRegistrations', 'Open corporate registrations')}
              colorScheme="red"
            />
            <StatCard
              label={t('dashboard.checkInStatus', 'Check-In Status')}
              value={t('dashboard.ready', 'Ready')}
              icon={CheckCircle2}
              subtext={t('dashboard.opticalScannerSupport', 'Optical scanner support')}
              colorScheme="emerald"
            />
            <StatCard
              label={t('dashboard.digitalPassEngine', 'Digital Pass Engine')}
              value="v2.4"
              icon={QrCode}
              subtext={t('dashboard.highContrastQr', 'High-contrast optical QR')}
              colorScheme="amber"
            />
          </>
        )}
      </div>

      {/* ── Quick Command Actions Grid (Organisers & Admins) ────────────────── */}
      {isOrganiser && (
        <div className="cst-stagger-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--cst-red-400)]" />
              {t('dashboard.quickCommandModules', 'Quick Command Modules')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/events/new" className="group">
              <div className="p-5 bg-[var(--surface-900)] border border-[var(--border-default)] hover:border-[var(--cst-blue-500)] rounded-3xl shadow-xl cst-card-hover flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/40 rounded-2xl text-[var(--cst-blue-400)]">
                    <PlusCircle className="w-5 h-5 text-[var(--cst-blue-400)]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--cst-blue-400)] transition-colors">
                      {t('dashboard.publishEvent', 'Publish Event')}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">{t('dashboard.createAgenda', 'Create agenda & details')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--cst-blue-400)] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link to="/admin/users" className="group">
              <div className="p-5 bg-[var(--surface-900)] border border-[var(--border-default)] hover:border-[var(--cst-red-500)] rounded-3xl shadow-xl cst-card-hover flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[var(--cst-red-800)]/20 border border-[var(--cst-red-600)]/40 rounded-2xl text-[var(--cst-red-400)]">
                    <Users className="w-5 h-5 text-[var(--cst-red-400)]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--cst-red-400)] transition-colors">
                      {t('dashboard.userManagement', 'User Management')}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">{t('dashboard.crudRoleAssignments', 'CRUD & Role assignments')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--cst-red-400)] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link to="/admin/check-in" className="group">
              <div className="p-5 bg-[var(--surface-900)] border border-[var(--border-default)] hover:border-emerald-500 rounded-3xl shadow-xl cst-card-hover flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-emerald-400">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                      {t('dashboard.doorCheckIn', 'Door Check-In')}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">{t('dashboard.opticalCameraTurnstile', 'Optical camera turnstile')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link to="/admin/analytics" className="group">
              <div className="p-5 bg-[var(--surface-900)] border border-[var(--border-default)] hover:border-amber-500 rounded-3xl shadow-xl cst-card-hover flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-2xl text-amber-400">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-400 transition-colors">
                      {t('dashboard.analyticsDashboard', 'Analytics Dashboard')}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">{t('dashboard.velocityGuestScores', 'Velocity & guest scores')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Featured Upcoming Events Section ─────────────────────────────────── */}
      <div className="cst-stagger-3 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--cst-blue-400)]" />
            {t('dashboard.upcomingCorporateSessions', 'Upcoming Corporate Sessions')}
          </h2>
          <Link
            to="/events"
            className="text-xs font-semibold text-[var(--cst-blue-400)] hover:text-[var(--cst-blue-500)] flex items-center gap-1 transition-colors group"
          >
            {t('dashboard.viewAllDirectory', 'View all directory')} <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {isError ? (
          <div className="p-6 flex items-center gap-3 bg-red-950/40 border border-red-800/50 rounded-2xl text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{t('dashboard.failedLoadEvents', 'Failed to load events. Please check backend API server status.')}</span>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl space-y-2 shadow-xl">
            <Calendar className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
            <p className="text-sm font-bold text-[var(--text-primary)]">{t('dashboard.noSessionsYet', 'No sessions published yet')}</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">{t('dashboard.eventsWillAppear', 'Events published in the system will appear here automatically.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.slice(0, 3).map((evt) => (
              <div
                key={evt.idEvent || evt.id}
                className="bg-[var(--surface-900)] border border-[var(--border-default)] p-6 rounded-3xl flex flex-col justify-between cst-card-hover group cursor-pointer shadow-xl relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {evt.company ? (
                      <span className="cst-badge-blue px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[var(--cst-blue-400)] shrink-0" />
                        <span className="truncate">{evt.company.name}</span>
                      </span>
                    ) : (
                      <span className="cst-badge-red px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {t('dashboard.independentSession', 'Independent Session')}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">#{evt.idEvent || evt.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--cst-blue-400)] transition-colors line-clamp-2 leading-snug">
                    {evt.title || 'Untitled Session'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                    {evt.description || 'No detailed agenda description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] space-y-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0 cst-card-icon" />
                    <span>{formatDate(evt.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0 cst-card-icon" />
                    <span className="truncate">{evt.address || t('dashboard.locationTbd', 'Location TBD')}</span>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-subtle)]/60 flex items-center justify-between gap-2">
                    <AddToCalendarDropdown event={evt} />
                    <Link
                      to={`/events/${evt.idEvent || evt.id}`}
                      className="text-xs font-bold text-[var(--cst-blue-400)] hover:text-[var(--cst-blue-500)] flex items-center gap-1 shrink-0"
                    >
                      {t('dashboard.sessionDetails', 'Details')} <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;