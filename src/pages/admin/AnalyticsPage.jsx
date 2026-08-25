import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  FileText,
  FileSpreadsheet,
  Zap,
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
import { useAuth } from '../../context/AuthContext';
import { checkPassDispatchStatus } from '../../utils/passUtils';
import { AIFeedbackInsightsCard } from '../../components/analytics/AIFeedbackInsightsCard';
import { EventPerformanceReportModal } from '../../components/analytics/EventPerformanceReportModal';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
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
  const { user, isSuperAdmin } = useAuth();
  const userCompanyId = !isSuperAdmin && (user?.idCompany || user?.companyId) ? (user.idCompany || user.companyId) : null;

  const [selectedEventId, setSelectedEventId] = useState('');
  const [dateRange, setDateRange] = useState('30d'); // 7d | 30d | all
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(''); // '' | PersonRole enum values
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 1. Fetch Events List (GET /api/Event)
  const { data: rawEvents = [] } = useQuery({
    queryKey: ['eventsListAnalytics'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
  });

  const events = React.useMemo(() => {
    const list = Array.isArray(rawEvents) ? rawEvents : rawEvents?.items ?? [];
    if (!userCompanyId) return list;
    return list.filter((ev) => {
      const cId = ev.idCompany || ev.IdCompany || ev.company?.idCompany || ev.company?.IdCompany;
      return String(cId) === String(userCompanyId);
    });
  }, [rawEvents, userCompanyId]);

  // 2. Fetch Persons List (GET /api/Person)
  const { data: rawPersons = [] } = useQuery({
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

  const persons = React.useMemo(() => {
    const list = Array.isArray(rawPersons) ? rawPersons : rawPersons?.items ?? [];
    if (!userCompanyId) return list;
    return list.filter((p) => {
      const cId = p.idCompany || p.company?.idCompany || p.companyId;
      return String(cId) === String(userCompanyId);
    });
  }, [rawPersons, userCompanyId]);

  // 3. Fetch Companies List (GET /api/Company)
  const { data: rawCompanies = [] } = useQuery({
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

  const companies = React.useMemo(() => {
    const list = Array.isArray(rawCompanies) ? rawCompanies : rawCompanies?.items ?? [];
    if (!userCompanyId) return list;
    return list.filter((c) => {
      const cId = c.idCompany || c.id;
      return String(cId) === String(userCompanyId);
    });
  }, [rawCompanies, userCompanyId]);

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

  // 7. Fetch AI Executive Insights for the active/selected event
  const targetReportEventId = selectedEventId || events[0]?.idEvent || events[0]?.id || null;
  const { data: aiInsights } = useQuery({
    queryKey: ['aiFeedbackInsights', targetReportEventId],
    queryFn: async () => {
      if (!targetReportEventId) return null;
      try {
        const res = await axiosClient.get(ENDPOINTS.AI.FEEDBACK_INSIGHTS(targetReportEventId));
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(targetReportEventId),
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

  const cancelledCount = activeParticipationsFiltered.filter((p) => {
    const status = (p.status || '').toLowerCase();
    return p.isCancelled || status.includes('cancel') || status.includes('decline');
  }).length;

  const cancelledRate =
    totalRegistrations > 0 ? (cancelledCount / totalRegistrations) * 100 : 0;

  const missedCount = Math.max(0, totalRegistrations - confirmedCheckInsCount - cancelledCount);

  const missedRate =
    totalRegistrations > 0 ? (missedCount / totalRegistrations) * 100 : 0;

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

  // ── Chart 3: Top Participating Companies (Real Companies in DB - SuperAdmin Only) ─
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

  // ── Post-Event Attendance Turnout Breakdown (Checked In vs Missed vs Cancelled) ─
  const turnoutBreakdownData = React.useMemo(() => {
    return [
      { name: 'Checked In', value: confirmedCheckInsCount, rate: checkInRate, color: '#10b981' },
      { name: 'Missed (No-Show)', value: missedCount, rate: missedRate, color: '#f59e0b' },
      { name: 'Cancelled', value: cancelledCount, rate: cancelledRate, color: '#f43f5e' },
    ];
  }, [confirmedCheckInsCount, checkInRate, missedCount, missedRate, cancelledCount, cancelledRate]);

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

  // Compute Peak Velocity Max & Peak Window
  const { peakVelocityMax, peakVelocityHour } = React.useMemo(() => {
    if (!checkInVelocityData || checkInVelocityData.length === 0) {
      return { peakVelocityMax: 0, peakVelocityHour: 'N/A' };
    }
    let maxVal = 0;
    let bestTime = 'N/A';
    checkInVelocityData.forEach((item) => {
      if (item.velocity > maxVal) {
        maxVal = item.velocity;
        bestTime = item.time;
      }
    });
    return { peakVelocityMax: maxVal, peakVelocityHour: bestTime };
  }, [checkInVelocityData]);

  // Selected event object for export
  const selectedEventObj = React.useMemo(() => {
    return events.find((e) => String(e.idEvent || e.id) === String(selectedEventId)) || null;
  }, [events, selectedEventId]);

  // ── CSV Export Engine ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const eventTitle = selectedEventObj?.title || 'All Events Aggregated Portfolio';
    const eventId = selectedEventObj?.idEvent || selectedEventObj?.id || 'all';

    const lines = [];
    lines.push(['EVENT PERFORMANCE & POST-EVENT ANALYTICS AUDIT']);
    lines.push(['Report Date', new Date().toISOString()]);
    lines.push(['Event Session', `"${eventTitle}"`]);
    lines.push(['Event ID', eventId]);
    lines.push(['Auditor Role', isSuperAdmin ? 'SuperAdmin Full Scope' : 'Event Organiser Post-Event Scope']);
    lines.push([]);

    // 1. Executive Performance Metrics
    lines.push(['EXECUTIVE PERFORMANCE KPIS']);
    lines.push(['Metric Name', 'Count / Value', 'Percentage Rate / Description']);
    lines.push(['Total Registrations', totalRegistrations, '100.0%']);
    lines.push(['Confirmed Checked-In', confirmedCheckInsCount, `${checkInRate.toFixed(1)}%`]);
    lines.push(['Missed / No-Shows', missedCount, `${missedRate.toFixed(1)}%`]);
    lines.push(['Cancelled Registrations', cancelledCount, `${cancelledRate.toFixed(1)}%`]);
    lines.push(['Average Guest Rating', avgRating > 0 ? avgRating.toFixed(1) : 'N/A', `${activeFeedbacks.length} Reviews Submitted`]);
    lines.push(['Positive Sentiment Rate', `${positiveSentimentPercentage}%`, 'Ratings >= 4 Stars']);
    lines.push(['Peak Check-In Velocity', `${peakVelocityMax} scans/hour`, `@ ${peakVelocityHour}`]);
    lines.push(['Pass Delivery Rate', `${passesDispatchedCount} sent`, `${passDeliveryRate.toFixed(1)}%`]);
    lines.push([]);

    // 2. Attendance Turnout Breakdown
    lines.push(['ATTENDANCE TURNOUT BREAKDOWN']);
    lines.push(['Status Category', 'Attendee Count', 'Conversion Rate (%)']);
    lines.push(['Confirmed Checked-In', confirmedCheckInsCount, `${checkInRate.toFixed(1)}%`]);
    lines.push(['Missed / No-Shows', missedCount, `${missedRate.toFixed(1)}%`]);
    lines.push(['Cancelled Registrations', cancelledCount, `${cancelledRate.toFixed(1)}%`]);
    lines.push([]);

    // 3. Hourly Check-In Velocity Timeline
    lines.push(['HOURLY CHECK-IN SCAN VELOCITY']);
    lines.push(['Time Slot', 'Scans Count']);
    checkInVelocityData.forEach((v) => {
      lines.push([`"${v.time}"`, v.velocity]);
    });
    lines.push([]);

    // 4. Guest Rating Distribution
    lines.push(['GUEST RATING DISTRIBUTION']);
    lines.push(['Star Rating', 'Review Count', 'Percentage (%)']);
    ratingDistribution.forEach((r) => {
      lines.push([`"${r.stars}"`, r.count, `${r.percentage}%`]);
    });
    lines.push([]);

    // 5. Top Companies (Only if SuperAdmin)
    if (isSuperAdmin && topCompaniesData.length > 0) {
      lines.push(['TOP PARTICIPATING PARTNER COMPANIES']);
      lines.push(['Rank', 'Company Name', 'Attendee Headcount']);
      topCompaniesData.forEach((c, idx) => {
        lines.push([idx + 1, `"${c.company}"`, c.count]);
      });
      lines.push([]);
    }

    // 6. Attendee Roster Detail Ledger
    lines.push(['ATTENDEE PARTICIPATION DETAILS']);
    lines.push(['Participation ID', 'Person ID', 'Full Name', 'Email', 'Role', 'Company', 'Attendance Status', 'Check-In Timestamp']);
    activeParticipationsFiltered.forEach((p) => {
      const pId = p.idPerson || p.person?.idPerson;
      const person = p.person || (pId ? personsMap[pId] : null) || {};
      const isCheckedIn = (p.status || '').toLowerCase().includes('check') || p.checkInStatus || p.isCheckedIn || Boolean(p.checkInTime);
      const isCancelled = p.isCancelled || (p.status || '').toLowerCase().includes('cancel') || (p.status || '').toLowerCase().includes('decline');
      const status = isCheckedIn ? 'CheckedIn' : isCancelled ? 'Cancelled' : 'Missed_NoShow';
      const personName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email?.split('@')[0] || 'Attendee';
      const companyName = person.company?.name || person.companyName || companiesMap[person.idCompany]?.name || 'N/A';
      
      lines.push([
        p.idParticipation || p.idPass || p.id || 'N/A',
        pId || 'N/A',
        `"${personName}"`,
        `"${person.email || ''}"`,
        `"${person.role || p.role || 'Attendee'}"`,
        `"${companyName}"`,
        status,
        `"${p.checkInTime || p.updatedAt || 'N/A'}"`,
      ]);
    });

    const csvContent = lines.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `event_${eventId}_performance_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
            {isSuperAdmin
              ? t('analytics.subtitle', 'Real-time platform KPIs, door velocity metrics, and participant role distribution.')
              : 'Post-event turnout performance, attendance status rates, guest ratings, and peak check-in velocity.'}
          </p>
        </div>

        {/* Toolbar Controls & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          {/* Export PDF Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            className="text-xs border-blue-500/40 bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('analytics.exportPdf', 'Export PDF Report')}</span>
          </Button>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('analytics.exportCsv', 'Export CSV Data')}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
          </Button>
        </div>
      </div>

      {/* ── KPI Scorecards Grid (Role-Tailored) ──────────────────────────────── */}
      <div className="cst-stagger-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Registrations */}
        <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Registrations
            </span>
            <div className="p-2 bg-blue-950/60 border border-blue-800/50 rounded-xl text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {totalRegistrations.toLocaleString()}
            </div>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Total passes claimed
            </p>
          </div>
        </Card>

        {/* Card 2: Check-In Rate */}
        <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-emerald-600/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {t('analytics.checkedInRate', 'Check-In Rate')}
            </span>
            <div className="p-2 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-300 tracking-tight">
              {checkInRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {confirmedCheckInsCount} checked in
            </p>
          </div>
        </Card>

        {/* Card 3: Missed (No-Show) Rate */}
        <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-amber-600/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              {t('analytics.missedRate', 'Missed Rate')}
            </span>
            <div className="p-2 bg-amber-950/60 border border-amber-800/50 rounded-xl text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              {missedRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-amber-400/90 font-medium mt-0.5">
              {missedCount} no-shows
            </p>
          </div>
        </Card>

        {/* Card 4: Cancelled Rate */}
        <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-rose-600/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              {t('analytics.cancelledRate', 'Cancelled Rate')}
            </span>
            <div className="p-2 bg-rose-950/60 border border-rose-800/50 rounded-xl text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-300 tracking-tight">
              {cancelledRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-rose-400/90 font-medium mt-0.5">
              {cancelledCount} cancelled passes
            </p>
          </div>
        </Card>

        {/* Card 5: Average Guest Rating */}
        <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-amber-600/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Guest Rating
            </span>
            <div className="p-2 bg-amber-950/60 border border-amber-800/50 rounded-xl text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-300 tracking-tight flex items-baseline gap-1">
              {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}{' '}
              <span className="text-xs font-normal text-slate-500">/ 5.0</span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-medium mt-0.5">
              {activeFeedbacks.length > 0 ? `${activeFeedbacks.length} Guest Reviews` : 'No reviews submitted'}
            </p>
          </div>
        </Card>

        {/* Card 6: Peak Check-In Arrival Velocity (or Pass Delivery for SuperAdmin) */}
        {!isSuperAdmin ? (
          <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-indigo-600/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Peak Velocity
              </span>
              <div className="p-2 bg-indigo-950/60 border border-indigo-800/50 rounded-xl text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-indigo-300 tracking-tight">
                {peakVelocityMax}{' '}
                <span className="text-xs font-normal text-slate-500">scans/hr</span>
              </div>
              <p className="text-[10px] text-indigo-300/90 font-medium mt-0.5 truncate">
                @ {peakVelocityHour}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl hover:border-purple-600/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Pass Delivery
              </span>
              <div className="p-2 bg-purple-950/60 border border-purple-800/50 rounded-xl text-purple-400">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-purple-300 tracking-tight">
                {passDeliveryRate.toFixed(1)}%
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {passesDispatchedCount} passes dispatched
              </p>
            </div>
          </Card>
        )}
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
        
        {/* 1. Post-Event Attendance Turnout Breakdown Card (Checked-In vs Missed vs Cancelled) */}
        <Card className="bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6 flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>{t('analytics.turnoutBreakdown', 'Attendance & Turnout Breakdown')}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Turnout conversion rate: Checked-in vs Missed (No-shows) vs Cancelled passes
              </CardDescription>
            </CardHeader>

            {totalRegistrations === 0 ? (
              <EmptyChartState title="No Attendance Records" message="Register attendees to visualize turnout conversion rates." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Donut Chart */}
                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={turnoutBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {turnoutBreakdownData.map((entry, index) => (
                          <Cell key={`turnout-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Turnout Stats Progress List */}
                <div className="space-y-3">
                  {/* Checked In */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                      </span>
                      <span className="font-mono text-slate-200 font-bold">
                        {confirmedCheckInsCount} ({checkInRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${checkInRate}%` }} />
                    </div>
                  </div>

                  {/* Missed */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-400 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missed (No-Show)
                      </span>
                      <span className="font-mono text-slate-200 font-bold">
                        {missedCount} ({missedRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${missedRate}%` }} />
                    </div>
                  </div>

                  {/* Cancelled */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-rose-400 font-bold flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Cancelled
                      </span>
                      <span className="font-mono text-slate-200 font-bold">
                        {cancelledCount} ({cancelledRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${cancelledRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Total Claimed: <strong className="text-slate-100">{totalRegistrations}</strong></span>
            <span className="text-emerald-400 font-semibold">{checkInRate.toFixed(1)}% Turnout</span>
          </div>
        </Card>

        {/* 2. Grouped Bar Chart: Registration vs Check-In Comparison */}
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

        {/* 3. Donut Chart: System Role Diversity (Only for SuperAdmin) */}
        {isSuperAdmin && (
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
        )}

        {/* 4. Horizontal Bar Chart: Top Participating Companies (Only for SuperAdmin) */}
        {isSuperAdmin && (
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
        )}

        {/* 5. Rating Breakdown Progress Bars */}
        <Card className={`${isSuperAdmin ? '' : 'lg:col-span-2'} bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6 flex flex-col justify-between`}>
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

        {/* 6. Area Chart: Peak Check-In Arrival Velocity (Full Span) */}
        <Card className="lg:col-span-2 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl p-6">
          <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-indigo-400" />
                <span>Peak Check-In Arrival Velocity</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Hourly distribution of turnstile QR scans to optimize door staffing and security capacity
              </CardDescription>
            </div>
            {peakVelocityMax > 0 && (
              <div className="px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 rounded-xl text-xs text-indigo-300 font-mono flex items-center gap-1.5 shrink-0">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Peak: <strong>{peakVelocityMax} scans/hr</strong> @ {peakVelocityHour}</span>
              </div>
            )}
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

      {/* ── Executive Performance Report Modal (PDF Export) ─────────────────── */}
      <EventPerformanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        event={selectedEventObj}
        isSuperAdmin={isSuperAdmin}
        user={user}
        stats={{
          totalRegistrations,
          confirmedCheckInsCount,
          checkInRate,
          missedCount,
          missedRate,
          cancelledCount,
          cancelledRate,
          avgRating,
          feedbacksCount: activeFeedbacks.length,
          positiveSentimentPercentage,
          ratingDistribution,
          peakVelocityData: checkInVelocityData,
          peakVelocityMax,
          peakVelocityHour,
          passDeliveryRate,
          passesDispatchedCount,
          topCompaniesData,
          aiInsights,
        }}
      />
    </div>
  );
};

export default AnalyticsPage;
