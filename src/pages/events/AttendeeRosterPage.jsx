import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
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
  SendHorizontal,
  AlertCircle,
  Building2,
  User,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Label } from '../../components/ui/Label';
import {
  sendSinglePass,
  sendAllPasses,
  sendSingleInvitation,
  sendAllInvitations,
  checkPassDispatchStatus,
} from '../../utils/passUtils';

const AttendeeRosterPage = () => {
  const { eventId, id: paramId } = useParams();
  const activeEventId = eventId || paramId;
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');
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

  const companiesMap = React.useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      const cId = c.idCompany || c.id;
      if (cId) map[cId] = c;
    });
    return map;
  }, [companies]);

  // Add Participant Mutation: POST /api/Participation
  const addParticipantMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosClient.post(ENDPOINTS.PARTICIPATION.BASE, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setIsAddModalOpen(false);
      setSelectedPersonId('');
      setDispatchStatus({ type: 'success', message: 'Participant successfully added to event!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to add participant.',
      });
    },
  });

  // Send Pass (Single)
  const sendSinglePassMutation = useMutation({
    mutationFn: async (participationId) => {
      return await sendSinglePass(participationId);
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
      setDispatchStatus({ type: 'success', message: data?.message || 'Pass dispatched via Email & WhatsApp!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch pass.',
      });
    },
  });

  // Send All Passes (Bulk)
  const sendAllPassesMutation = useMutation({
    mutationFn: async () => {
      return await sendAllPasses(activeEventId, attendees);
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
      setDispatchStatus({ type: 'success', message: data?.message || 'All passes queued and dispatched!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch bulk passes.',
      });
    },
  });

  // Send Single WhatsApp Template Invitation ("hello_world")
  const sendSingleInvitationMutation = useMutation({
    mutationFn: async (targetPartId) => {
      return await sendSingleInvitation(targetPartId);
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ['eventParticipations', activeEventId] }, (oldData) => {
        if (!oldData) return oldData;
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        const updated = list.map((item) => ({ ...item, sentWhatsApp: true, whatsAppSent: true }));
        return Array.isArray(oldData) ? updated : { ...oldData, data: updated };
      });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setDispatchStatus({ type: 'success', message: data?.message || 'WhatsApp template invitation sent to attendee!' });
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    onError: (err) => {
      setDispatchStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to send WhatsApp invitation.',
      });
    },
  });

  // Send All WhatsApp Template Invitations (Bulk "hello_world")
  const sendAllInvitationsMutation = useMutation({
    mutationFn: async () => {
      return await sendAllInvitations(activeEventId, attendees);
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ['eventParticipations', activeEventId] }, (oldData) => {
        if (!oldData) return oldData;
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        const updated = list.map((item) => ({ ...item, sentWhatsApp: true, whatsAppSent: true }));
        return Array.isArray(oldData) ? updated : { ...oldData, data: updated };
      });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', activeEventId] });
      setDispatchStatus({ type: 'success', message: data?.message || 'Bulk WhatsApp template invitations sent!' });
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
    if (!selectedPersonId) return;
    const pId = parseInt(selectedPersonId, 10);
    addParticipantMutation.mutate({
      idEvent: parseInt(activeEventId, 10),
      idPerson: isNaN(pId) ? 1 : pId,
    });
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

    return { personId, firstName, lastName, fullName, email, companyName };
  };

  const filteredAttendees = attendees.filter((item) => {
    const { fullName, email, companyName, personId } = getParticipantDetails(item);
    const query = searchQuery.toLowerCase();
    const personIdStr = String(personId || '');
    const partIdStr = String(item.idParticipation || item.idPass || item.id || '');

    return (
      fullName.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      companyName.toLowerCase().includes(query) ||
      personIdStr.includes(query) ||
      partIdStr.includes(query)
    );
  });

  const checkedInCount = attendees.filter((a) => a.checkInStatus || a.isCheckedIn || a.status === 'CheckedIn').length;
  const invitedCount = attendees.length - checkedInCount;

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
      const status = a.checkInStatus || a.isCheckedIn || a.status === 'CheckedIn' ? 'CheckedIn' : a.isCancelled || a.status === 'Cancelled' ? 'Cancelled' : 'Invited';
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

  /**
   * Distinct Badge Color Helper per Key Design Takeaways:
   * - Invited ➔ Blue
   * - CheckedIn ➔ Green
   * - Cancelled ➔ Gray
   */
  const getStatusBadge = (item) => {
    const rawStatus = (item.status || (item.checkInStatus || item.isCheckedIn ? 'CheckedIn' : item.isCancelled ? 'Cancelled' : 'Invited')).toLowerCase();

    if (rawStatus.includes('check')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 shrink-0">
          <CheckCircle2 className="w-3 h-3" /> CheckedIn
        </span>
      );
    }
    if (rawStatus.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800/80 border border-slate-700/50 text-slate-400 shrink-0">
          <Ban className="w-3 h-3 text-slate-400" /> Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/60 border border-blue-800/50 text-blue-400 shrink-0">
        <Clock3 className="w-3 h-3" /> Invited
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

          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl text-center min-w-[100px] shadow-md">
              <span className="text-[10px] font-bold uppercase text-[var(--cst-blue-400)] block">Invited</span>
              <span className="text-2xl font-black text-[var(--cst-blue-300)]">{invitedCount}</span>
            </div>
            <div className="p-3.5 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl text-center min-w-[100px] shadow-md">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">CheckedIn</span>
              <span className="text-2xl font-black text-emerald-300">{checkedInCount}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Prominent Bulk-Action Toolbar above Attendee Data Table */}
      <Card className="cst-stagger-2 p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left: Search Bar */}
          <div className="flex items-center gap-3 bg-[var(--surface-800)] p-2.5 px-3.5 rounded-2xl border border-[var(--border-default)] w-full lg:w-96">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <Input
              type="text"
              placeholder="Search by participant name, company, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none shadow-none focus:ring-0 bg-transparent text-xs p-0"
            />
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

            <Button
              onClick={() => sendAllInvitationsMutation.mutate()}
              disabled={sendAllInvitationsMutation.isPending || attendees.length === 0}
              size="sm"
              variant="outline"
              className="text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
              title="Send initial WhatsApp template invitation ('hello_world') to all attendees"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              {sendAllInvitationsMutation.isPending ? 'Sending Invitations...' : 'Send All Invitations'}
            </Button>

            <Button
              onClick={() => sendAllPassesMutation.mutate()}
              disabled={sendAllPassesMutation.isPending || attendees.length === 0}
              size="sm"
              variant="outline"
              className="text-xs border-indigo-500/40 text-indigo-400 hover:bg-indigo-950/40"
              title="Generate and dispatch Digital Passes & Programs to all attendees"
            >
              <SendHorizontal className="w-3.5 h-3.5 mr-1.5" />
              {sendAllPassesMutation.isPending ? 'Dispatching All Passes...' : 'Send All Passes'}
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
            <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No attendees found</p>
            <p className="text-xs text-[var(--text-muted)]">
              {searchQuery ? `No participant matches "${searchQuery}".` : 'No participants registered for this event yet.'}
            </p>
            <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="mt-2 text-xs">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add First Participant
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-secondary)] border-collapse">
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead className="bg-[var(--surface-850)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3.5 px-4">Participant Name</th>
                  <th className="py-3.5 px-4">Contact Email</th>
                  <th className="py-3.5 px-4">Company / Host</th>
                  <th className="py-3.5 px-4">Participation ID</th>
                  <th className="py-3.5 px-4">Pass Status</th>
                  <th className="py-3.5 px-4">Dispatch Channels</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredAttendees.map((item, idx) => {
                  const partId = item.idParticipation || item.idPass || item.id;
                  const { personId, fullName, email, companyName } = getParticipantDetails(item);
                  const { sentEmail, sentWhatsApp } = checkPassDispatchStatus(item);

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

                      {/* 5. Pass Status */}
                      <td className="py-4 px-4">
                        {getStatusBadge(item)}
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
                          <Button
                            onClick={() => partId && sendSingleInvitationMutation.mutate(partId)}
                            disabled={sendSingleInvitationMutation.isPending || !partId}
                            size="sm"
                            variant="outline"
                            className="text-[11px] py-1 px-2 border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/40"
                            title="Send initial WhatsApp template invitation ('hello_world')"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {sendSingleInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
                          </Button>

                          <Button
                            onClick={() => partId && sendSinglePassMutation.mutate(partId)}
                            disabled={sendSinglePassMutation.isPending || !partId}
                            size="sm"
                            variant="outline"
                            className="text-[11px] py-1 px-2 border-[var(--cst-blue-600)]/30 text-[var(--cst-blue-400)] hover:bg-[var(--cst-blue-950)]/40"
                            title="Generate and dispatch Digital Pass & Program PDF via Email/WhatsApp"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {sendSinglePassMutation.isPending ? 'Sending...' : 'Send Pass'}
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

      {/* Add Participant Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Participant to Event"
        description={`Register a new guest or attendee for Event #${activeEventId}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddParticipant} className="space-y-4">
          <div>
            <Label htmlFor="person-id-select" className="text-xs">
              Select Registered Person *
            </Label>
            {persons.length > 0 ? (
              <select
                id="person-id-select"
                required
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] font-medium"
              >
                <option value="">-- Select Person --</option>
                {persons.map((p) => {
                  const pId = p.idPerson || p.id;
                  const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || p.email;
                  return (
                    <option key={pId} value={pId}>
                      {name} ({p.email || `ID #${pId}`})
                    </option>
                  );
                })}
              </select>
            ) : (
              <Input
                id="person-id"
                type="number"
                required
                placeholder="e.g. 1, 2, 5..."
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            )}
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Select person record to issue digital event participation.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addParticipantMutation.isPending || !selectedPersonId}
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white"
            >
              {addParticipantMutation.isPending ? 'Adding...' : 'Add Participant'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendeeRosterPage;
