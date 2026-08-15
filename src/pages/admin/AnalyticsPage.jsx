import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Star,
  Send,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Building2,
  Activity,
  RefreshCw,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ALL_ROLES, getRoleStyle, normalizeRole, ROLES } from '../../utils/roleUtils';
import { useLanguage } from '../../context/LanguageContext';
import { checkPassDispatchStatus } from '../../utils/passUtils';
import { AIFeedbackInsightsCard } from '../../components/analytics/AIFeedbackInsightsCard';

// Default Color Palettes for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#94a3b8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1">
        <p className="font-bold text-slate-100">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.fill }}>
            <span className="font-semibold">{entry.name}: </span>
            {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Skeletons for Loading State
const AnalyticsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-16 bg-slate-900/80 border border-slate-800 rounded-3xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-slate-900/80 border border-slate-800 rounded-3xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-slate-900/80 border border-slate-800 rounded-3xl" />
      <div className="h-80 bg-slate-900/80 border border-slate-800 rounded-3xl" />
    </div>
  </div>
);

const EmptyChartState = ({ title, message }) => (
  <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
    <Inbox className="w-8 h-8 opacity-40" />
    <p className="text-xs font-semibold text-slate-300">{title}</p>
    <p className="text-[11px] text-slate-500 max-w-xs">{message}</p>
  </div>
);

const AnalyticsPage = () => {
  const { t } = useLanguage();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [dateRange, setDateRange] = useState('30d'); // 7d | 30d | all
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(''); // '' | PersonRole enum values

  // 1. Fetch Events List (GET /api/Event)
  const { data: events = [] } = useQuery({
    queryKey: ['eventsListAnalytics'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
  });

  // 2. Fetch Persons List (GET /api/Person)
  const { data: persons = [] } = useQuery({
    queryKey: ['allPersonsAnalytics'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.PERSON.BASE);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Companies List (GET /api/Company)
  const { data: companies = [] } = useQuery({
    queryKey: ['allCompaniesAnalytics'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Participations for all events via GET /api/Participation/event/{eventId}
  const { data: participations = [], isLoading: participationsLoading } = useQuery({
    queryKey: ['allParticipationsAnalytics', events],
    enabled: events.length > 0,
    queryFn: async () => {
      try {
        const results = await Promise.allSettled(
          events.map(async (ev) => {
            const evId = ev.idEvent || ev.id;
            const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.BY_EVENT(evId));
            const items = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
            return items.map((item) => ({ ...item, idEvent: item.idEvent || evId }));
          })
        );
        const all = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            all.push(...r.value);
          }
        });
        return all;
      } catch (err) {
        console.warn('Error fetching participations:', err);
        return [];
      }
    },
  });

  // 5. Fetch Feedback Ratings for all events via GET /api/Feedback/event/{eventId}
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['allFeedbacksAnalytics', events],
    enabled: events.length > 0,
    queryFn: async () => {
      try {
        const results = await Promise.allSettled(
          events.map(async (ev) => {
            const evId = ev.idEvent || ev.id;
            const res = await axiosClient.get(ENDPOINTS.FEEDBACK.BY_EVENT(evId));
            const items = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
            return items.map((item) => ({ ...item, idEvent: item.idEvent || evId }));
          })
        );
        const all = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            all.push(...r.value);
          }
        });
        return all;
      } catch (err) {
        console.warn('Error fetching feedbacks:', err);
        return [];
      }
    },
  });

  // 6. Fetch Backend Analytics Overview Endpoint if available
  const { data: backendAnalytics, refetch } = useQuery({
    queryKey: ['backendAnalytics', selectedEventId, dateRange, selectedRoleFilter],
    queryFn: async () => {
      try {
        let endpoint = ENDPOINTS.ANALYTICS.OVERVIEW;
        if (selectedEventId) {
          endpoint = ENDPOINTS.ANALYTICS.EVENT(selectedEventId);
        }
        const res = await axiosClient.get(endpoint);
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // Construct Lookup Maps
  const personsMap = React.useMemo(() => {
    const map = {};
    persons.forEach((p) => {
      const pId = p.idPerson || p.id;
      if (pId) map[pId] = p;
    });
    return map;
  }, [persons]);

  const companiesMap = React.useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      const cId = c.idCompany || c.id;
      if (cId) map[cId] = c;
    });
    return map;
  }, [companies]);

  // Filter participations by selected event
  const activeParticipations = React.useMemo(() => {
    if (!selectedEventId) return participations;
    const targetId = parseInt(selectedEventId, 10);
    return participations.filter((p) => (p.idEvent || p.event?.idEvent) === targetId);
  }, [participations, selectedEventId]);

  // Filter participations further by selected role breakdown filter
  const activeParticipationsFiltered = React.useMemo(() => {
    if (!selectedRoleFilter) return activeParticipations;
    return activeParticipations.filter((p) => {
      const personId = p.idPerson || p.person?.idPerson;
      const person = p.person || (personId ? personsMap[personId] : null) || {};
      const normRole = normalizeRole(person.role || p.role || ROLES.ATTENDEE);
      return normRole === selectedRoleFilter;
    });
  }, [activeParticipations, selectedRoleFilter, personsMap]);

  // Filter feedback by selected event
  const activeFeedbacks = React.useMemo(() => {
    if (!selectedEventId) return feedbacks;
    const targetId = parseInt(selectedEventId, 10);
    return feedbacks.filter((f) => (f.idEvent || f.event?.idEvent) === targetId);
  }, [feedbacks, selectedEventId]);

  // ── Calculate REAL KPI Metrics ─────────────────────────────────────────────
  const totalRegistrations = activeParticipationsFiltered.length;

  const confirmedCheckInsCount = activeParticipationsFiltered.filter((p) => {
    const status = (p.status || '').toLowerCase();
    return status.includes('check') || p.checkInStatus || p.isCheckedIn || Boolean(p.checkInTime);
  }).length;

  const checkInRate =
    totalRegistrations > 0 ? (confirmedCheckInsCount / totalRegistrations) * 100 : 0;

  const avgRating = React.useMemo(() => {
    if (backendAnalytics?.averageRating && !selectedRoleFilter) return backendAnalytics.averageRating;
    if (activeFeedbacks.length === 0) return 0;
    const sum = activeFeedbacks.reduce((acc, curr) => acc + (curr.rating || curr.score || 0), 0);
    return sum / activeFeedbacks.length;
  }, [backendAnalytics, activeFeedbacks, selectedRoleFilter]);

  const passesDispatchedCount = activeParticipationsFiltered.filter((p) => {
    const { sentEmail, sentWhatsApp } = checkPassDispatchStatus(p);
    return sentEmail || sentWhatsApp;
  }).length;

  const passDeliveryRate =
    totalRegistrations > 0 ? (passesDispatchedCount / totalRegistrations) * 100 : 0;

  // ── Chart 1: Registrations vs Check-Ins per Real Event ──────────────────────
  const comparisonData = React.useMemo(() => {
    if (events.length === 0) return [];

    return events.map((ev) => {
      const evId = ev.idEvent || ev.id;
      const eventParts = activeParticipationsFiltered.filter((p) => (p.idEvent || p.event?.idEvent) === evId);
      const eventCheckIns = eventParts.filter((p) => {
        const s = (p.status || '').toLowerCase();
        return s.includes('check') || p.checkInStatus || p.isCheckedIn || Boolean(p.checkInTime);
      }).length;

      return {
        name: ev.title ? (ev.title.length > 18 ? `${ev.title.substring(0, 16)}...` : ev.title) : `Event #${evId}`,
        Registrations: eventParts.length,
        CheckIns: eventCheckIns,
      };
    });
  }, [events, activeParticipationsFiltered]);

  // ── Chart 2: Participant System Role Diversity across ALL 8 Roles
  const participantDiversityData = React.useMemo(() => {
    const roleCounts = {};
    ALL_ROLES.forEach((r) => {
      roleCounts[r] = 0;
    });

    if (persons.length > 0 && !selectedEventId) {
      persons.forEach((p) => {
        const norm = normalizeRole(p.role || p.user?.role || ROLES.ATTENDEE);
        if (roleCounts[norm] !== undefined) {
          roleCounts[norm] += 1;
        } else {
          roleCounts[ROLES.ATTENDEE] += 1;
        }
      });
    } else {
      activeParticipations.forEach((item) => {
        const personId = item.idPerson || item.person?.idPerson;
        const person = item.person || (personId ? personsMap[personId] : null) || {};
        const norm = normalizeRole(person.role || item.role || ROLES.ATTENDEE);
        if (roleCounts[norm] !== undefined) {
          roleCounts[norm] += 1;
        } else {
          roleCounts[ROLES.ATTENDEE] += 1;
        }
      });
    }

    return ALL_ROLES.map((r) => {
      const style = getRoleStyle(r);
      return {
        name: style.label,
        roleKey: r,
        value: roleCounts[r] || 0,
        color: style.color,
      };
    }).filter((item) => item.value > 0);
  }, [persons, activeParticipations, personsMap, selectedEventId]);

  // ── Chart 3: Top Participating Companies (Real Companies in DB) ─────────────
  const topCompaniesData = React.useMemo(() => {
    if (backendAnalytics?.topCompanies && backendAnalytics.topCompanies.length > 0) {
      return backendAnalytics.topCompanies;
    }

    const companyCounts = {};

    activeParticipations.forEach((item) => {
      const personId = item.idPerson || item.person?.idPerson;
      const person = item.person || (personId ? personsMap[personId] : null) || {};
      const companyId = person.idCompany || item.idCompany;
      const companyObj = person.company || item.company || (companyId ? companiesMap[companyId] : null);

      const compName = companyObj?.name || person.companyName || item.companyName || 'Independent Host';
      companyCounts[compName] = (companyCounts[compName] || 0) + 1;
    });

    const sorted = Object.entries(companyCounts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return sorted;
  }, [backendAnalytics, activeParticipations, personsMap, companiesMap]);

  // ── Chart 4: Rating Breakdown Distribution (Real Feedback DB Data) ─────────
  const ratingDistribution = React.useMemo(() => {
    if (backendAnalytics?.ratingDistribution && backendAnalytics.ratingDistribution.length > 0) {
      return backendAnalytics.ratingDistribution;
    }

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    activeFeedbacks.forEach((f) => {
      const score = Math.min(5, Math.max(1, Math.round(f.rating || f.score || 5)));
      counts[score] = (counts[score] || 0) + 1;
    });

    const total = activeFeedbacks.length || 1;

    return [
      { stars: '5 Stars', count: counts[5], percentage: activeFeedbacks.length ? Math.round((counts[5] / total) * 100) : 0 },
      { stars: '4 Stars', count: counts[4], percentage: activeFeedbacks.length ? Math.round((counts[4] / total) * 100) : 0 },
      { stars: '3 Stars', count: counts[3], percentage: activeFeedbacks.length ? Math.round((counts[3] / total) * 100) : 0 },
      { stars: '2 Stars', count: counts[2], percentage: activeFeedbacks.length ? Math.round((counts[2] / total) * 100) : 0 },
      { stars: '1 Star', count: counts[1], percentage: activeFeedbacks.length ? Math.round((counts[1] / total) * 100) : 0 },
    ];
  }, [backendAnalytics, activeFeedbacks]);

  const positiveSentimentPercentage = React.useMemo(() => {
    if (activeFeedbacks.length === 0) return 0;
    const positiveCount = activeFeedbacks.filter((f) => (f.rating || f.score || 0) >= 4).length;
    return Math.round((positiveCount / activeFeedbacks.length) * 100);
  }, [activeFeedbacks]);

  // ── Chart 5: Peak Check-In Arrival Velocity ─────────────────────────────────
  const checkInVelocityData = React.useMemo(() => {
    if (backendAnalytics?.checkInVelocity && backendAnalytics.checkInVelocity.length > 0) {
      return backendAnalytics.checkInVelocity;
    }

    const hourCounts = {};

    // 1. Accumulate DB check-in timestamps
    activeParticipations.forEach((p) => {
      const isCheckedIn = (p.status || '').toLowerCase().includes('check') || p.checkInStatus || p.isCheckedIn || Boolean(p.checkInTime);
      if (isCheckedIn) {
        const rawDate = p.checkInTime || p.updatedAt;
        if (rawDate) {
          const date = new Date(rawDate);
          if (!isNaN(date.getTime())) {
            const h = date.getHours();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const formattedHour = `${String(h % 12 || 12).padStart(2, '0')}:00 ${ampm}`;
            hourCounts[formattedHour] = (hourCounts[formattedHour] || 0) + 1;
          }
        }
      }
    });

    // 2. Accumulate Live Door Scanner localStorage entries
    try {
      const liveScans = JSON.parse(localStorage.getItem('eventhub_live_door_scans') || '[]');
      liveScans.forEach((scan) => {
        const scanEvId = parseInt(scan.eventId, 10);
        if (!selectedEventId || scanEvId === parseInt(selectedEventId, 10)) {
          const date = new Date(scan.timestamp);
          if (!isNaN(date.getTime())) {
            const h = date.getHours();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const formattedHour = `${String(h % 12 || 12).padStart(2, '0')}:00 ${ampm}`;
            hourCounts[formattedHour] = (hourCounts[formattedHour] || 0) + 1;
          }
        }
      });
    } catch {
      // Ignore
    }

    const baseSlots = [
      '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
      '06:00 PM', '07:00 PM', '08:00 PM'
    ];

    const allSlots = Array.from(new Set([...baseSlots, ...Object.keys(hourCounts)]));

    return allSlots.map((time) => ({
      time,
      velocity: hourCounts[time] || 0,
    }));
  }, [backendAnalytics, activeParticipations, selectedEventId]);

  if (participationsLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <AnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* ── Header Toolbar ─────────────────────────────────────────────────── */}
      <div className="cst-stagger-1 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 cst-hero-gradient border border-[var(--border-default)] rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('analytics.systemAnalytics', 'System Analytics & KPIs')}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {t('analytics.title', 'Executive Analytics Dashboard')}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t('analytics.subtitle', 'Real-time platform KPIs, door velocity metrics, and participant role distribution.')}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Event Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[var(--surface-800)] border border-[var(--border-default)] rounded-2xl px-3 py-1.5 text-xs">
            <Filter className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-semibold outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-100">
                {t('analytics.allEvents', 'All Events')}
              </option>
              {events.map((ev) => (
                <option key={ev.idEvent || ev.id} value={ev.idEvent || ev.id} className="bg-slate-900 text-slate-100">
                  {ev.title} (ID #{ev.idEvent || ev.id})
                </option>
              ))}
            </select>
          </div>

          {/* Role Breakdown Filter Dropdown */}
          <div className="flex items-center gap-2 bg-[var(--surface-800)] border border-[var(--border-default)] rounded-2xl px-3 py-1.5 text-xs">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-semibold outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-100">
                All User Roles
              </option>
              {ALL_ROLES.map((r) => {
                const style = getRoleStyle(r);
                return (
                  <option key={r} value={r} className="bg-slate-900 text-slate-100">
                    {style.label} ({r})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Range Indicator */}
          <div className="flex items-center gap-2 bg-[var(--surface-800)] border border-[var(--border-default)] rounded-2xl px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-semibold outline-none text-xs cursor-pointer"
            >
              <option value="7d" className="bg-slate-900">Last 7 Days</option>
              <option value="30d" className="bg-slate-900">Last 30 Days</option>
              <option value="all" className="bg-slate-900">All Time</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[var(--cst-blue-400)]" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Scorecards Grid (4 Top Cards with Icons) ────────────────────── */}
      <div className="cst-stagger-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Registrations */}
        <Card className="p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-[var(--cst-blue-600)]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Total Registrations
            </span>
            <div className="p-2.5 bg-blue-950/60 border border-blue-800/50 rounded-2xl text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
              {totalRegistrations.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Database records loaded
            </p>
          </div>
        </Card>

        {/* Card 2: Check-in Conversion Rate */}
        <Card className="p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-emerald-600/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Check-In Conversion
            </span>
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-2xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-300 tracking-tight">
              {typeof checkInRate === 'number' ? `${checkInRate.toFixed(1)}%` : checkInRate}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {confirmedCheckInsCount} confirmed door entries
            </p>
          </div>
        </Card>

        {/* Card 3: Average Event Rating */}
        <Card className="p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-amber-600/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Average Guest Rating
            </span>
            <div className="p-2.5 bg-amber-950/60 border border-amber-800/50 rounded-2xl text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-300 tracking-tight flex items-baseline gap-1">
              {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}{' '}
              <span className="text-sm font-normal text-slate-400">/ 5.0</span>
            </div>
            <p className="text-[11px] text-amber-400/90 font-semibold mt-1">
              {activeFeedbacks.length > 0 ? `${activeFeedbacks.length} Guest Reviews` : 'No reviews submitted yet'}
            </p>
          </div>
        </Card>

        {/* Card 4: Pass Delivery Rate */}
        <Card className="p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-purple-600/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Pass Delivery Rate
            </span>
            <div className="p-2.5 bg-purple-950/60 border border-purple-800/50 rounded-2xl text-purple-400">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-purple-300 tracking-tight">
              {typeof passDeliveryRate === 'number' ? `${passDeliveryRate.toFixed(1)}%` : passDeliveryRate}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {passesDispatchedCount} Email &amp; WA passes sent
            </p>
          </div>
        </Card>
      </div>

      {/* ── AI Executive Feedback & Sentiment Insights ────────────────────── */}
      {(selectedEventId || events[0]?.idEvent || events[0]?.id) && (
        <AIFeedbackInsightsCard
          eventId={selectedEventId || events[0]?.idEvent || events[0]?.id}
          eventTitle={
            events.find((e) => String(e.idEvent || e.id) === String(selectedEventId))?.title ||
            events[0]?.title ||
            'Selected Event'
          }
        />
      )}

      {/* ── Charts & Visualizations Grid ───────────────────────────────────── */}
      <div className="cst-stagger-3 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Grouped Bar Chart: Registration vs Check-In Comparison */}
        <Card className="bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-[var(--cst-blue-400)]" />
              <span>Registrations vs. Check-Ins Comparison</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Comparative volume of claimed passes against actual door check-ins per event
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-72">
            {comparisonData.length === 0 ? (
              <EmptyChartState title="No Events Found" message="Create an event to view registration vs check-in comparisons." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="Registrations" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="CheckIns" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. Donut Chart: System Role Diversity (Attendee, EventOrganiser, SuperAdmin) */}
        <Card className="bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <span>Participant System Role Diversity</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown across all 8 user role categories (Attendee, VIP, Spokesperson, Speaker, Sponsor, Staff, Organiser, SuperAdmin)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-72 flex items-center justify-center">
            {participantDiversityData.length === 0 ? (
              <EmptyChartState title="No Person Records" message="Register persons to see system role distribution." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={participantDiversityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {participantDiversityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 3. Horizontal Bar Chart: Top Participating Companies */}
        <Card className="bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
              <Building2 className="w-5 h-5 text-purple-400" />
              <span>Top Participating Companies</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Organizations represented by highest attendee headcount
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-80">
            {topCompaniesData.length === 0 ? (
              <EmptyChartState title="No Company Data" message="Assign company affiliations to attendees to view top organizations." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topCompaniesData}
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="company" type="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Attendees" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 4. Rating Breakdown Progress Bars */}
        <Card className="bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6 flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
                <Star className="w-5 h-5 text-amber-400" />
                <span>Guest Rating Score Breakdown</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Score distribution across 1-Star to 5-Star guest feedback submissions
              </CardDescription>
            </CardHeader>

            {activeFeedbacks.length === 0 ? (
              <EmptyChartState title="No Ratings Submitted" message="No feedback reviews submitted for this scope yet." />
            ) : (
              <div className="space-y-3.5">
                {ratingDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        {item.stars}
                      </span>
                      <span className="font-mono text-slate-400">
                        {item.count} reviews ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Total Feedback Items: <strong className="text-slate-100">{activeFeedbacks.length}</strong>
            </span>
            <span className="text-emerald-400 font-semibold">{positiveSentimentPercentage}% Positive Sentiment</span>
          </div>
        </Card>

        {/* 5. Area Chart: Peak Check-In Arrival Velocity (Full Span) */}
        <Card className="lg:col-span-2 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Peak Check-In Arrival Velocity</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Hourly distribution of turnstile QR scans to optimize door staffing and security capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={checkInVelocityData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  name="Arrival Scans / Hr"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVelocity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AnalyticsPage;
