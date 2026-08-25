import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock3,
  Ban,
  ShieldCheck,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  UserPlus,
  Send,
  AlertCircle,
  Building2,
  User,
  X,
  FileText,
  CalendarClock,
} from 'lucide-react';
import { LinkedInIcon } from '../../components/ui/LinkedInIcon';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Label } from '../../components/ui/Label';
import { PersonAutocomplete } from '../../components/ui/PersonAutocomplete';
import { useAuth } from '../../context/AuthContext';
import {
  sendSingleProgram,
  sendAllPrograms,
  sendSingleInvitation,
  sendAllInvitations,
  checkPassDispatchStatus,
} from '../../utils/passUtils';

const AttendeeRosterPage = () => {
  const { eventId, id: paramId } = useParams();
  const activeEventId = eventId || paramId;
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const userCompanyId = !isSuperAdmin && (user?.idCompany || user?.companyId) ? (user.idCompany || user.companyId) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const [dispatchStatus, setDispatchStatus] = useState(null);

  // 1. Fetch Event Details
  const { data: event } = useQuery({
    queryKey: ['event', activeEventId],
    queryFn: async () => {
      if (!activeEventId) return null;
      const res = await axiosClient.get(ENDPOINTS.EVENT.BY_ID(activeEventId));
      return res.data;
    },
    enabled: Boolean(activeEventId),
  });

  // 2. Fetch participations for this specific event: GET /api/Participation/event/{eventId}
  const {
    data: attendees = [],
    isLoading: rosterLoading,
    isError,
  } = useQuery({
    queryKey: ['eventParticipations', activeEventId],
    queryFn: async () => {
      if (!activeEventId) return [];
      const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.BY_EVENT(activeEventId));
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    enabled: Boolean(activeEventId),
  });

  // 3. Fetch all Persons to map Person details (Name, Email, Company) if not nested in participation
  const { data: persons = [] } = useQuery({
    queryKey: ['allPersonsList'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.PERSON.BASE);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch all Companies to map Company Name if idCompany is provided
  const { data: companies = [] } = useQuery({
    queryKey: ['allCompaniesList'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch {
        return [];
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

  // Filter selectable persons in Add Modal to only this company's employees (or event's company)
  const availablePersons = React.useMemo(() => {
    const effectiveCompanyId = userCompanyId || event?.idCompany || event?.company?.idCompany || event?.companyId;
    if (!effectiveCompanyId && isSuperAdmin) return persons;
    if (effectiveCompanyId) {
      return persons.filter((p) => {
        const pCompId = p.idCompany || p.company?.idCompany || p.companyId;
        return String(pCompId) === String(effectiveCompanyId);
      });
    }
    return persons;
  }, [persons, userCompanyId, event, isSuperAdmin]);

  const companiesMap = React.useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      const cId = c.idCompany || c.id;
      if (cId) map[cId] = c;
    });
    return map;
  }, [companies]);

  // Set of person IDs already registered in this event to avoid confusion
  const existingPersonIds = React.useMemo(() => {
    const set = new Set();
    attendees.forEach((a) => {
      const pId = a.idPerson || a.person?.idPerson || a.person?.id;
      if (pId) set.add(String(pId));
    });
    return set;
  }, [attendees]);

  // Identify display name of currently scoped company
  const effectiveCompanyName = React.useMemo(() => {
    const effectiveCompanyId = userCompanyId || event?.idCompany || event?.company?.idCompany || event?.companyId;
    if (effectiveCompanyId && companiesMap[effectiveCompanyId]) {
      return companiesMap[effectiveCompanyId].name;
    }
    if (user?.companyName) return user.companyName;
    if (event?.company?.name) return event.company.name;
    return '';
  }, [userCompanyId, event, companiesMap, user]);

  // Add Participant Mutation (Single or Bulk): POST /api/Participation
  const addParticipantMutation = useMutation({
    mutationFn: async (personIds) => {
      const ids = Array.isArray(personIds) ? personIds : [personIds];
      const parsedEventId = parseInt(activeEventId, 10);

      const results = await Promise.allSettled(
        ids.map((id) => {
          const pId = parseInt(id, 10);
          return axiosClient.post(ENDPOINTS.PARTICIPATION.BASE, {
            idEvent: parsedEventId,
            idPerson: isNaN(pId) ? 1 : pId,
          });
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      if (successful.length === 0 && failed.length > 0) {
        const errorReason = failed[0].reason?.response?.data?.message || failed[0].reason?.message || 'Failed to add participant(s).';
        throw new Error(errorReason);
      }

      return {
        total: ids.length,
        successfulCount: successful.length,
        failedCount: failed.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setIsAddModalOpen(false);
      setSelectedPersonIds([]);
      const message =
        data.total > 1
          ? `Successfully registered ${data.successfulCount} participant(s) to event roster!${data.failedCount > 0 ? ` (${data.failedCount} already registered)` : ''}`
          : 'Participant successfully added to event!';
      setDispatchStatus({ type: 'success', message });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.message || err.response?.data?.message || 'Failed to add participant(s).',
      });
    },
  });

  // STAGE 1: Send Event Program (Single - Email + WhatsApp)
  const sendSingleProgramMutation = useMutation({
    mutationFn: async (participationId) => {
      return await sendSingleProgram(participationId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setDispatchStatus({ type: 'success', message: data?.message || 'Event Program dispatched via Email & WhatsApp!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch event program.',
      });
    },
  });

  // STAGE 1: Send All Event Programs (Bulk - Email + WhatsApp)
  const sendAllProgramsMutation = useMutation({
    mutationFn: async () => {
      return await sendAllPrograms(activeEventId, attendees);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setDispatchStatus({ type: 'success', message: data?.message || 'Event Programs dispatched via Email & WhatsApp to all participants!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch bulk event programs.',
      });
    },
  });

  // STAGE 2: Send Official Invitation / Access Pass (Single - Email + WhatsApp)
  const sendSingleInvitationMutation = useMutation({
    mutationFn: async (targetPartId) => {
      return await sendSingleInvitation(targetPartId);
    },
    onSuccess: (data, targetPartId) => {
      queryClient.setQueriesData({ queryKey: ['eventParticipations', activeEventId] }, (oldData) => {
        if (!oldData) return oldData;
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        const updated = list.map((item) => {
          const partId = item.idParticipation || item.idPass || item.id;
          if (String(partId) === String(targetPartId)) {
            return {
              ...item,
              sentEmail: true,
              sentWhatsApp: true,
              emailSent: true,
              whatsAppSent: true,
            };
          }
          return item;
        });
        return Array.isArray(oldData) ? updated : { ...oldData, data: updated };
      });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setDispatchStatus({ type: 'success', message: data?.message || 'Official Invitation & Pass dispatched via Email & WhatsApp!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to send invitation pass.',
      });
    },
  });

  // STAGE 2: Send All Official Invitations / Access Passes (Bulk - Email + WhatsApp)
  const sendAllInvitationsMutation = useMutation({
    mutationFn: async () => {
      return await sendAllInvitations(activeEventId, attendees);
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ['eventParticipations', activeEventId] }, (oldData) => {
        if (!oldData) return oldData;
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        const updated = list.map((item) => ({
          ...item,
          sentEmail: true,
          sentWhatsApp: true,
          emailSent: true,
          whatsAppSent: true,
        }));
        return Array.isArray(oldData) ? updated : { ...oldData, data: updated };
      });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setDispatchStatus({ type: 'success', message: data?.message || 'Official Invitation Passes dispatched via Email & WhatsApp to all participants!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to send bulk invitations.',
      });
    },
  });

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!selectedPersonIds || selectedPersonIds.length === 0) return;
    addParticipantMutation.mutate(selectedPersonIds);
  };

  /**
   * Helper to extract participant details with deep fallback to Person and Company lookup maps
   */
  const getParticipantDetails = (item) => {
    const personId = item.idPerson || item.person?.idPerson || item.person?.id;
    const person = item.person || (personId ? personsMap[personId] : null) || {};

    const firstName = person.firstName || item.firstName || '';
    const lastName = person.lastName || item.lastName || '';
    let fullName = `${firstName} ${lastName}`.trim();

    if (!fullName) {
      fullName = person.name || item.name || (person.email ? person.email.split('@')[0] : `Participant #${personId || item.idParticipation || item.id}`);
    }

    const email = person.email || item.email || (person.user?.email) || 'N/A';

    const companyId = person.idCompany || item.idCompany;
    const companyObj = person.company || item.company || (companyId ? companiesMap[companyId] : null);
    const companyName = companyObj?.name || person.companyName || item.companyName || 'Independent Host';
    const linkedInUrl = person.linkedInUrl || person.LinkedInUrl || item.linkedInUrl || item.LinkedInUrl || '';

    return { personId, firstName, lastName, fullName, email, companyName, linkedInUrl };
  };

  const handlePingLinkedIn = (attendeeItem) => {
    const { fullName, firstName, linkedInUrl } = getParticipantDetails(attendeeItem);
    if (!linkedInUrl) return;

    const partId = attendeeItem.idParticipation || attendeeItem.idPass || attendeeItem.id;
    const eventTitle = event?.title || event?.Title || event?.name || 'Corporate Event';
    const rawDate = event?.date || event?.Date || event?.dateEvent;
    const eventDate = rawDate ? new Date(rawDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Upcoming Date';
    const eventLocation = event?.address || event?.Address || event?.location || 'Main Venue';
    const ticketUrl = partId ? `${window.location.origin}/tickets/${partId}` : window.location.origin;

    const message = `🎟️ *Official Event Invitation - EventHub*\n\nHello ${firstName || fullName}!\nYou are officially registered for "${eventTitle}".\n\n📅 Date: ${eventDate}\n📍 Venue: ${eventLocation}\n🔗 Your Digital Pass & QR: ${ticketUrl}\n\nLooking forward to seeing you there!`;

    navigator.clipboard.writeText(message);

    setDispatchStatus({
      type: 'success',
      message: `Personalized pass message copied for ${fullName}! Opening LinkedIn profile...`,
    });
    setTimeout(() => setDispatchStatus(null), 4000);

    const targetProfile = linkedInUrl.startsWith('http') ? linkedInUrl : `https://${linkedInUrl}`;
    window.open(targetProfile, '_blank', 'noopener,noreferrer');
  };

  const filteredAttendees = attendees.filter((item) => {
    const { fullName, email, companyName, personId } = getParticipantDetails(item);
    const query = searchQuery.toLowerCase().trim();
    const personIdStr = String(personId || '');
    const partIdStr = String(item.idParticipation || item.idPass || item.id || '');

    const matchesQuery =
      !query ||
      fullName.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      companyName.toLowerCase().includes(query) ||
      personIdStr.includes(query) ||
      partIdStr.includes(query);

    if (!matchesQuery) return false;

    if (!statusFilter) return true;

    const rawStatus = (
      item.status ||
      (item.checkInStatus || item.isCheckedIn
        ? 'CheckedIn'
        : item.isCancelled
        ? 'Cancelled'
        : 'Pending')
    ).toLowerCase();

    if (statusFilter === 'checkedin') {
      return rawStatus.includes('check');
    }
    if (statusFilter === 'confirmed') {
      return rawStatus === 'confirmed';
    }
    if (statusFilter === 'reconfirm') {
      return rawStatus.includes('reconfirm') || rawStatus.includes('re-confirm');
    }
    if (statusFilter === 'cancelled') {
      return rawStatus.includes('cancel');
    }
    if (statusFilter === 'invited' || statusFilter === 'pending') {
      return (
        !rawStatus.includes('check') &&
        rawStatus !== 'confirmed' &&
        !rawStatus.includes('reconfirm') &&
        !rawStatus.includes('re-confirm') &&
        !rawStatus.includes('cancel')
      );
    }

    return true;
  });

  const confirmedCount = attendees.filter((a) => (a.status || '').toLowerCase() === 'confirmed').length;
  const reConfirmCount = attendees.filter((a) => {
    const st = (a.status || '').toLowerCase().replace('-', '');
    return st === 'reconfirm';
  }).length;
  const checkedInCount = attendees.filter((a) => a.checkInStatus || a.isCheckedIn || (a.status || '').toLowerCase().includes('check')).length;
  const cancelledCount = attendees.filter((a) => a.isCancelled || (a.status || '').toLowerCase().includes('cancel')).length;
  const pendingCount = Math.max(0, attendees.length - (confirmedCount + reConfirmCount + checkedInCount + cancelledCount));

  const handleExportCSV = () => {
    if (attendees.length === 0) return;
    const headers = [
      'Participation ID',
      'Person ID',
      'First Name',
      'Last Name',
      'Full Name',
      'Email',
      'Company',
      'Pass Status',
      'Sent Email',
      'Sent WhatsApp',
    ];
    const rows = attendees.map((a) => {
      const { personId, firstName, lastName, fullName, email, companyName } = getParticipantDetails(a);
      const status = a.checkInStatus || a.isCheckedIn || a.status === 'CheckedIn' ? 'CheckedIn' : a.isCancelled || a.status === 'Cancelled' ? 'Cancelled' : a.status || 'Pending';
      return [
        a.idParticipation || a.idPass || a.id || 'N/A',
        personId || 'N/A',
        firstName || 'N/A',
        lastName || 'N/A',
        fullName,
        email,
        companyName,
        status,
        a.sentEmail || a.emailSent ? 'Yes' : 'No',
        a.sentWhatsApp || a.whatsAppSent ? 'Yes' : 'No',
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `event_${activeEventId}_attendee_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update Attendance Status Mutation with Multi-Tier Fallback and Instant Optimistic Update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ participationId, status }) => {
      const payload = { status, Status: status };
      try {
        const res = await axiosClient.patch(ENDPOINTS.PARTICIPATION.UPDATE_STATUS(participationId), payload);
        return res.data;
      } catch (patchErr) {
        try {
          const res = await axiosClient.put(ENDPOINTS.PARTICIPATION.UPDATE_STATUS(participationId), payload);
          return res.data;
        } catch {
          const res = await axiosClient.put(ENDPOINTS.PARTICIPATION.BY_ID(participationId), payload);
          return res.data;
        }
      }
    },
    onMutate: async ({ participationId, status }) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['eventParticipations', activeEventId] });
      const previousAttendees = queryClient.getQueryData(['eventParticipations', activeEventId]);

      // Optimistically update cache immediately (0ms response)
      queryClient.setQueryData(['eventParticipations', activeEventId], (oldData) => {
        if (!oldData) return oldData;
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.items || oldData?.$values || []);
        const updated = list.map((item) => {
          const partId = item.idParticipation || item.idPass || item.id;
          if (String(partId) === String(participationId)) {
            return {
              ...item,
              status: status,
              Status: status,
              checkInStatus: status === 'CheckedIn',
              isCheckedIn: status === 'CheckedIn',
              isCancelled: status === 'Cancelled',
            };
          }
          return item;
        });
        return Array.isArray(oldData) ? updated : { ...oldData, data: updated };
      });

      return { previousAttendees };
    },
    onError: (err, variables, context) => {
      if (context?.previousAttendees) {
        queryClient.setQueryData(['eventParticipations', activeEventId], context.previousAttendees);
      }
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update attendance status.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
    },
    onSuccess: (data, variables) => {
      setDispatchStatus({
        type: 'success',
        message: data?.message || `Attendance status changed to '${variables.status}'!`,
      });
      setTimeout(() => setDispatchStatus(null), 3500);
    },
  });

  /**
   * Attendance Status Badges:
   * - Confirmed ➔ Emerald
   * - CheckedIn ➔ Cyan
   * - Pending / Invited ➔ Amber
   * - Cancelled ➔ Red / Slate
   */
  const getStatusBadge = (item) => {
    const rawStatus = (
      item.status ||
      (item.checkInStatus || item.isCheckedIn ? 'CheckedIn' : item.isCancelled ? 'Cancelled' : 'Pending')
    ).toLowerCase();

    if (rawStatus.includes('check')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 shrink-0">
          <ShieldCheck className="w-3 h-3 text-cyan-400" /> Checked-In
        </span>
      );
    }
    if (rawStatus.includes('reconfirm') || rawStatus.includes('re-confirm')) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-950/60 border border-purple-800/50 text-purple-300 shrink-0"
          title="Contact on another date for re-confirmation"
        >
          <CalendarClock className="w-3 h-3 text-purple-400" /> Re-Confirm
        </span>
      );
    }
    if (rawStatus === 'confirmed' || (rawStatus.includes('confirm') && !rawStatus.includes('reconfirm') && !rawStatus.includes('re-confirm'))) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 shrink-0">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Confirmed
        </span>
      );
    }
    if (rawStatus.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/60 border border-rose-800/50 text-rose-300 shrink-0">
          <Ban className="w-3 h-3 text-rose-400" /> Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/60 border border-amber-800/50 text-amber-300 shrink-0">
        <Clock3 className="w-3 h-3 text-amber-400" /> {rawStatus.includes('invit') ? 'Invited' : 'Pending RSVP'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb */}
      <div className="cst-stagger-1">
        <Link
          to={`/events/${activeEventId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Event Overview
        </Link>
      </div>

      {/* Dispatch / Operation Feedback */}
      {dispatchStatus && (
        <Alert variant={dispatchStatus.type === 'error' ? 'destructive' : 'default'} className="cst-stagger-1">
          <div className="flex items-center gap-2 text-xs">
            {dispatchStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{dispatchStatus.message}</span>
          </div>
        </Alert>
      )}

      {/* Header Banner */}
      <Card className="cst-stagger-1 p-6 md:p-8 cst-hero-gradient border-[var(--border-default)] rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
              <span>Attendee Roster Administration</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              {event?.title ? `Roster: ${event.title}` : `Event Roster #${activeEventId}`}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              View participant names, company affiliations, email contacts, and dispatch passes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === 'confirmed' ? '' : 'confirmed'))}
              className={`p-3 rounded-2xl text-center min-w-[90px] shadow-md transition-all cursor-pointer border ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-500/40'
                  : 'bg-[var(--surface-850)] border-emerald-800/40 hover:bg-emerald-950/30'
              }`}
              title="Click to filter by Confirmed"
            >
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">Confirmed</span>
              <span className="text-xl font-black text-emerald-300">{confirmedCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === 'invited' ? '' : 'invited'))}
              className={`p-3 rounded-2xl text-center min-w-[90px] shadow-md transition-all cursor-pointer border ${
                statusFilter === 'invited'
                  ? 'bg-amber-900/60 border-amber-400 ring-2 ring-amber-500/40'
                  : 'bg-[var(--surface-850)] border-amber-800/40 hover:bg-amber-950/30'
              }`}
              title="Click to filter by Invited / Pending"
            >
              <span className="text-[10px] font-bold uppercase text-amber-400 block">Pending</span>
              <span className="text-xl font-black text-amber-300">{pendingCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === 'reconfirm' ? '' : 'reconfirm'))}
              className={`p-3 rounded-2xl text-center min-w-[90px] shadow-md transition-all cursor-pointer border ${
                statusFilter === 'reconfirm'
                  ? 'bg-purple-900/60 border-purple-400 ring-2 ring-purple-500/40'
                  : 'bg-[var(--surface-850)] border-purple-800/40 hover:bg-purple-950/30'
              }`}
              title="Click to filter by Re-Confirm (Follow-up scheduled)"
            >
              <span className="text-[10px] font-bold uppercase text-purple-400 block">Re-Confirm</span>
              <span className="text-xl font-black text-purple-300">{reConfirmCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === 'checkedin' ? '' : 'checkedin'))}
              className={`p-3 rounded-2xl text-center min-w-[90px] shadow-md transition-all cursor-pointer border ${
                statusFilter === 'checkedin'
                  ? 'bg-cyan-900/60 border-cyan-400 ring-2 ring-cyan-500/40'
                  : 'bg-[var(--surface-850)] border-cyan-800/40 hover:bg-cyan-950/30'
              }`}
              title="Click to filter by Checked-In"
            >
              <span className="text-[10px] font-bold uppercase text-cyan-400 block">CheckedIn</span>
              <span className="text-xl font-black text-cyan-300">{checkedInCount}</span>
            </button>

            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'cancelled' ? '' : 'cancelled'))}
                className={`p-3 rounded-2xl text-center min-w-[90px] shadow-md transition-all cursor-pointer border ${
                  statusFilter === 'cancelled'
                    ? 'bg-rose-900/60 border-rose-400 ring-2 ring-rose-500/40'
                    : 'bg-[var(--surface-850)] border-rose-800/40 hover:bg-rose-950/30'
                }`}
                title="Click to filter by Cancelled"
              >
                <span className="text-[10px] font-bold uppercase text-rose-400 block">Cancelled</span>
                <span className="text-xl font-black text-rose-300">{cancelledCount}</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Prominent Bulk-Action Toolbar above Attendee Data Table */}
      <Card className="cst-stagger-2 p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left: Search Bar & Status Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            <div className="flex items-center gap-3 bg-[var(--surface-800)] p-2.5 px-3.5 rounded-2xl border border-[var(--border-default)] w-full sm:w-80 shadow-sm">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <Input
                type="text"
                placeholder="Search by name, company, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none shadow-none focus:ring-0 bg-transparent text-xs p-0 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Attendance Status Filter Dropdown */}
            <div className="w-full sm:w-52">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[var(--surface-800)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] cursor-pointer font-medium"
              >
                <option value="">⏱️ All Statuses ({attendees.length})</option>
                <option value="invited">🟡 Invited / Pending ({pendingCount})</option>
                <option value="confirmed">🟢 Confirmed ({confirmedCount})</option>
                <option value="reconfirm">🟣 Re-Confirm ({reConfirmCount})</option>
                <option value="checkedin">🔵 Checked-In ({checkedInCount})</option>
                {cancelledCount > 0 && <option value="cancelled">🔴 Cancelled ({cancelledCount})</option>}
              </select>
            </div>
          </div>

          {/* Right: Bulk Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              size="sm"
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-xs shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Participant
            </Button>

            {/* Bulk Actions: Stage 1 Send Programs & Stage 2 Send Invitations */}
            <Button
              onClick={() => sendAllProgramsMutation.mutate()}
              disabled={sendAllProgramsMutation.isPending || attendees.length === 0}
              size="sm"
              variant="outline"
              className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40"
              title="Dispatch Event Program PDF via Email & WhatsApp to all participants"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              {sendAllProgramsMutation.isPending ? 'Sending Programs...' : 'Send All Programs'}
            </Button>

            <Button
              onClick={() => sendAllInvitationsMutation.mutate()}
              disabled={sendAllInvitationsMutation.isPending || attendees.length === 0}
              size="sm"
              variant="outline"
              className="text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
              title="Dispatch Official Event Invitation & Pass with QR code via Email & WhatsApp to all participants"
            >
              <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              {sendAllInvitationsMutation.isPending ? 'Sending Invitations...' : 'Send All Invitations'}
            </Button>

            <Button onClick={handleExportCSV} disabled={attendees.length === 0} size="sm" variant="outline" className="text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Export Roster (CSV)
            </Button>
          </div>
        </div>
      </Card>

      {/* Roster Table with Explicit Column Alignment */}
      <Card className="cst-stagger-3 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl overflow-hidden shadow-2xl">
        {rosterLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--cst-blue-600)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[var(--text-secondary)]">Loading attendee roster...</p>
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="destructive">
              Failed to load attendee roster for Event #{activeEventId}. Please verify backend endpoints.
            </Alert>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No attendees match your current filter.</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {statusFilter || searchQuery
                ? `No participant found with status "${statusFilter || 'Any'}" or query "${searchQuery || 'Any'}".`
                : 'No participants registered for this event yet.'}
            </p>
            {(statusFilter || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface-800)] hover:bg-[var(--surface-700)] text-[var(--cst-blue-400)] border border-[var(--border-default)] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="bg-[var(--surface-850)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3.5 px-4">Participant Name</th>
                  <th className="py-3.5 px-4">Contact Email</th>
                  <th className="py-3.5 px-4">Company / Host</th>
                  <th className="py-3.5 px-4">Participation ID</th>
                  <th className="py-3.5 px-4">Attendance Status</th>
                  <th className="py-3.5 px-4">Dispatch Channels</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredAttendees.map((item, idx) => {
                  const partId = item.idParticipation || item.idPass || item.id;
                  const { personId, fullName, email, companyName, linkedInUrl } = getParticipantDetails(item);
                  const { sentEmail, sentWhatsApp } = checkPassDispatchStatus(item);
                  const rawStatus = item.status || (item.checkInStatus || item.isCheckedIn ? 'CheckedIn' : item.isCancelled ? 'Cancelled' : 'Pending');
                  const currentStatus = String(rawStatus).toLowerCase().replace('-', '') === 'reconfirm' ? 'ReConfirm' : rawStatus;

                  return (
                    <tr key={partId || idx} className="hover:bg-[var(--nav-hover-bg)] transition-colors">
                      {/* 1. Participant Name */}
                      <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-800)] border border-[var(--border-default)] flex items-center justify-center font-bold text-xs text-[var(--cst-blue-400)] shrink-0">
                            {fullName[0]?.toUpperCase() || <User className="w-4 h-4" />}
                          </div>
                          <div className="truncate min-w-0">
                            <div className="font-bold text-slate-100 truncate">{fullName}</div>
                            {personId && (
                              <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                                Person ID: #{personId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact Email */}
                      <td className="py-4 px-4 font-mono truncate">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
                          <Mail className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>
                      </td>

                      {/* 3. Company / Host */}
                      <td className="py-4 px-4 truncate">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{companyName}</span>
                        </div>
                      </td>

                      {/* 4. Participation ID */}
                      <td className="py-4 px-4 font-mono text-[var(--text-muted)]">
                        #{partId || 'N/A'}
                      </td>

                      {/* 5. Attendance Status & Quick Selector */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item)}
                          {partId && (
                            <select
                              value={currentStatus}
                              disabled={updateStatusMutation.isPending}
                              onChange={(e) => {
                                updateStatusMutation.mutate({
                                  participationId: partId,
                                  status: e.target.value,
                                });
                              }}
                              className="bg-slate-950/80 border border-slate-700/60 text-[10px] text-slate-300 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              title="Update Attendance Status"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Invited">Invited</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="ReConfirm">Re-Confirm</option>
                              <option value="CheckedIn">CheckedIn</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* 6. Dispatch Channel Indicators */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            title={sentEmail ? 'Pass sent via Email' : 'Email pending'}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                              sentEmail
                                ? 'bg-blue-950/60 border-blue-800/60 text-blue-400'
                                : 'bg-[var(--surface-800)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            <span>{sentEmail ? 'Sent' : 'Pending'}</span>
                          </span>

                          <span
                            onClick={() => partId && sendSingleInvitationMutation.mutate(partId)}
                            title={sentWhatsApp ? 'WhatsApp invitation sent (Click to resend)' : 'Send WhatsApp template invitation via Meta API'}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                              sentWhatsApp
                                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/80 hover:border-emerald-500'
                                : 'bg-[var(--surface-800)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-emerald-700/60 hover:text-emerald-400'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{sentWhatsApp ? 'Sent' : 'Send WA'}</span>
                          </span>
                        </div>
                      </td>

                      {/* 7. Single Invitation & Pass Dispatch Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {linkedInUrl && (
                            <Button
                              onClick={() => handlePingLinkedIn(item)}
                              size="sm"
                              variant="outline"
                              className="text-[11px] py-1 px-2 border-sky-500/30 text-sky-400 hover:bg-sky-950/40"
                              title="Copy personalized pass message and open attendee's LinkedIn profile"
                            >
                              <LinkedInIcon className="w-3 h-3 mr-1" /> Ping
                            </Button>
                          )}

                          {/* Stage 1: Send Program Button (Email + WhatsApp) */}
                          <Button
                            onClick={() => partId && sendSingleProgramMutation.mutate(partId)}
                            disabled={sendSingleProgramMutation.isPending || !partId}
                            size="sm"
                            variant="outline"
                            className="text-[11px] py-1 px-2 border-cyan-600/30 text-cyan-400 hover:bg-cyan-950/40"
                            title="Dispatch Event Program PDF via Email & WhatsApp to this attendee"
                          >
                            <FileText className="w-3 h-3 mr-1 text-cyan-400" />
                            {sendSingleProgramMutation.isPending ? 'Sending...' : 'Send Program'}
                          </Button>

                          {/* Stage 2: Send Official Invitation / Pass with QR Button (Email + WhatsApp) */}
                          <Button
                            onClick={() => partId && sendSingleInvitationMutation.mutate(partId)}
                            disabled={sendSingleInvitationMutation.isPending || !partId}
                            size="sm"
                            variant="outline"
                            className="text-[11px] py-1 px-2 border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/40"
                            title="Dispatch Official Invitation Pass & QR code via Email & WhatsApp"
                          >
                            <Send className="w-3 h-3 mr-1 text-emerald-400" />
                            {sendSingleInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Participant Modal (Single & Bulk) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedPersonIds([]);
        }}
        title="Add Participants to Event"
        description={`Register guests or attendees in bulk for Event #${activeEventId}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddParticipant} className="space-y-5">
          <div>
            <Label htmlFor="person-autocomplete" className="text-xs mb-1.5 block">
              Search & Select Registered People (Single or Bulk) *
            </Label>

            <PersonAutocomplete
              persons={availablePersons}
              selectedPersonIds={selectedPersonIds}
              onSelectPersons={(ids) => setSelectedPersonIds(ids)}
              existingPersonIds={existingPersonIds}
              companyScopeName={effectiveCompanyName}
              isSuperAdmin={isSuperAdmin}
              placeholder="Type name (e.g. Sami, Youssef, Dhia), email, or ID..."
              multiSelect={true}
            />

            <p className="text-[11px] text-[var(--text-muted)] mt-2">
              Select one or multiple individuals to register them concurrently under your company scope.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setSelectedPersonIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addParticipantMutation.isPending || selectedPersonIds.length === 0}
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white shadow-md"
            >
              {addParticipantMutation.isPending
                ? 'Registering...'
                : selectedPersonIds.length > 1
                ? `Add ${selectedPersonIds.length} Participants`
                : selectedPersonIds.length === 1
                ? 'Add 1 Participant'
                : 'Add Participant'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendeeRosterPage;
