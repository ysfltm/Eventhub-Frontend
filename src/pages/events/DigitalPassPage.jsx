import React, { useState, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Building2,
  Printer,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  User,
  Clock3,
  Ban,
  Award,
  CalendarClock,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { fetchMyPasses, extractEventId } from '../../utils/passUtils';
import { AddToCalendarDropdown } from '../../components/events/AddToCalendarDropdown';
import { CertificateModal } from '../../components/events/CertificateModal';
import { EventAiConciergeWidget } from '../../components/ai/EventAiConciergeWidget';

const QRCodeDisplay = ({ value, size = 180 }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=020617&bgcolor=ffffff`;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border-4 border-slate-800 shadow-xl">
      <img
        src={qrUrl}
        alt={`QR Code Pass: ${value}`}
        width={size}
        height={size}
        className="w-auto h-auto max-w-full rounded"
      />
    </div>
  );
};

const DigitalPassPage = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const { t, dir } = useLanguage();
  const printRef = useRef(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // 1. Primary: Fetch user's passes list
  const {
    data: myPasses = [],
    isLoading: isPassesLoading,
  } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
  });

  const matchedPassFromList = myPasses.find(
    (p) =>
      String(p.idParticipation || p.idPass || p.id) === String(id) ||
      String(p.idEvent || p.event?.idEvent || p.event?.id) === String(id)
  );

  // 2. Secondary fallback: Fetch direct participation record if not yet found in list
  const { data: directParticipation, isLoading: isDirectLoading } = useQuery({
    queryKey: ['directParticipation', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.BY_ID(id));
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(id && !matchedPassFromList),
  });

  const pass = matchedPassFromList || directParticipation;

  // Attendee RSVP Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ participationId, status }) => {
      const payload = { status, Status: status };
      try {
        const res = await axiosClient.patch(ENDPOINTS.PARTICIPATION.UPDATE_STATUS(participationId), payload);
        return res.data;
      } catch {
        try {
          const res = await axiosClient.put(ENDPOINTS.PARTICIPATION.UPDATE_STATUS(participationId), payload);
          return res.data;
        } catch {
          const res = await axiosClient.put(ENDPOINTS.PARTICIPATION.BY_ID(participationId), payload);
          return res.data;
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['myPasses'] });
      queryClient.invalidateQueries({ queryKey: ['directParticipation', id] });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations'] });
    },
  });

  // 3. Tertiary fallback: Fetch event if missing from pass
  const eventIdFromPass = extractEventId(pass) || pass?.idEvent || pass?.IdEvent || (id && !isNaN(parseInt(id, 10)) ? parseInt(id, 10) : null);
  const { data: directEvent } = useQuery({
    queryKey: ['directPassEvent', eventIdFromPass],
    queryFn: async () => {
      if (!eventIdFromPass) return null;
      try {
        const res = await axiosClient.get(ENDPOINTS.EVENT.BY_ID(eventIdFromPass));
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(eventIdFromPass && !pass?.event?.title),
  });

  const event = pass?.event || directEvent || {};

  // Fetch QuestPDF Pass & Invitation record
  const { data: invitation } = useQuery({
    queryKey: ['invitation', pass?.idParticipation || pass?.idPass || pass?.id || id],
    queryFn: async () => {
      try {
        const targetId = pass?.idParticipation || pass?.idPass || pass?.id || id;
        const res = await axiosClient.get(ENDPOINTS.INVITATION.BY_PARTICIPATION(targetId));
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(id),
  });

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const getStatusBadge = () => {
    if (!pass) return null;
    const rawStatus = (
      pass.status ||
      (pass.checkInStatus ? 'CheckedIn' : pass.isCheckedIn ? 'CheckedIn' : pass.isCancelled ? 'Cancelled' : 'Invited')
    ).toLowerCase();

    if (rawStatus.includes('check')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" /> CheckedIn
        </span>
      );
    }
    if (rawStatus.includes('reconfirm') || rawStatus.includes('re-confirm')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/60 border border-purple-800/50 text-purple-300 shrink-0">
          <CalendarClock className="w-3.5 h-3.5" /> Re-Confirm
        </span>
      );
    }
    if (rawStatus === 'confirmed' || (rawStatus.includes('confirm') && !rawStatus.includes('reconfirm') && !rawStatus.includes('re-confirm'))) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
        </span>
      );
    }
    if (rawStatus.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 border border-slate-700/50 text-slate-400 shrink-0">
          <Ban className="w-3.5 h-3.5" /> Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-800/50 text-amber-300 shrink-0">
        <Clock3 className="w-3.5 h-3.5" /> Pending RSVP
      </span>
    );
  };

  const isLoading = isPassesLoading || (isDirectLoading && !pass);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--cst-blue-600)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[var(--text-secondary)]">Generating digital pass QR code...</p>
      </div>
    );
  }

  if (!pass && !isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-4 pt-8">
        <Link to="/passes" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="w-4 h-4" /> Back to My Passes
        </Link>
        <Alert variant="destructive">
          Digital entry pass #{id} could not be located or verified for your account.
        </Alert>
      </div>
    );
  }

  const rawPassEventId = event?.idEvent || event?.id || pass?.idEvent || '0';
  const rawPassPersonId = user?.idPerson || user?.id || pass?.idPerson || pass?.person?.idPerson || '0';
  const rawPassGuid = pass?.guid || pass?.ticketGuid;
  const validPassGuid = (rawPassGuid && rawPassGuid !== '00000000-0000-0000-0000-000000000000')
    ? rawPassGuid
    : `PASS-${rawPassEventId}-${rawPassPersonId}-${pass?.idParticipation || pass?.idPass || pass?.id || id || '1'}`;

  const rawPassCode =
    (pass?.pass?.qrCode && !pass.pass.qrCode.includes('00000000-0000-0000-0000-000000000000') && pass.pass.qrCode) ||
    (pass?.invitation?.qrCode && !pass.invitation.qrCode.includes('00000000-0000-0000-0000-000000000000') && pass.invitation.qrCode) ||
    (pass?.qrCode && !pass.qrCode.includes('00000000-0000-0000-0000-000000000000') && pass.qrCode) ||
    `EVENTHUB-${rawPassEventId}-${rawPassPersonId}-${validPassGuid}`;

  const isCheckedIn = Boolean(
    pass?.checkInStatus ||
    pass?.isCheckedIn ||
    pass?.checkInTime ||
    pass?.CheckInTime ||
    pass?.status === 'CheckedIn' ||
    pass?.Status === 'CheckedIn'
  );

  return (
    <div dir={dir} className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header Actions */}
      <div className="flex flex-wrap items-center justify-between no-print cst-stagger-1 gap-2">
        <Link
          to="/passes"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to All Passes
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {(pass?.checkInStatus || pass?.checkInTime || pass?.status === 'CheckedIn') && (
            <Button
              onClick={() => setIsCertModalOpen(true)}
              size="sm"
              className="text-xs font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('certificate.viewCertificate', 'Official Certificate')}</span>
            </Button>
          )}
          {event && event.title && <AddToCalendarDropdown event={event} />}
          <Button onClick={handlePrint} size="sm" variant="outline" className="text-xs cursor-pointer">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Ticket / PDF
          </Button>
        </div>
      </div>

      {/* Printable Digital Pass Container */}
      <div ref={printRef} className="print:w-full print:m-0 print:p-0">
        <Card className="cst-stagger-1 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl overflow-hidden shadow-2xl relative border-2 border-[var(--cst-blue-700)]/40">
          {/* Top Brand Stripe */}
          <div className="h-3 bg-gradient-to-r from-[var(--cst-blue-800)] via-[var(--cst-blue-600)] to-[var(--cst-red-700)]" />

          {/* Pass Header */}
          <div className="p-6 md:p-8 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                <span>Verified Entry Pass</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {event.title || 'Corporate Event Session'}
              </h1>
              {event.company && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--cst-blue-400)] font-semibold mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{event.company.name || event.company}</span>
                </div>
              )}
            </div>

            {/* Status Badge & RSVP Selector */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              {getStatusBadge()}
              {pass && (
                <div className="flex items-center gap-1.5 no-print">
                  <span className="text-[11px] font-bold text-[var(--text-muted)]">RSVP:</span>
                  {isCheckedIn ? (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-bold"
                      title="Checked in at venue turnstile - attendance status is permanently locked"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Checked-In (Locked)
                    </span>
                  ) : (
                    <select
                      value={
                        String(pass.status || '').toLowerCase().replace('-', '') === 'reconfirm'
                          ? 'ReConfirm'
                          : (pass.status || '').toLowerCase().includes('confirm')
                          ? 'Confirmed'
                          : (pass.status || '').toLowerCase().includes('cancel')
                          ? 'Cancelled'
                          : (pass.status || '').toLowerCase().includes('check')
                          ? 'CheckedIn'
                          : 'Pending'
                      }
                      disabled={updateStatusMutation.isPending}
                      onChange={(e) => {
                        const pId = pass.idParticipation || pass.idPass || pass.id || id;
                        updateStatusMutation.mutate({
                          participationId: pId,
                          status: e.target.value,
                        });
                      }}
                      className="bg-[var(--surface-950)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] cursor-pointer"
                      title="Update your RSVP status"
                    >
                      <option value="Confirmed">🟢 Confirm</option>
                      <option value="ReConfirm">🟣 Re-Confirm</option>
                      <option value="Pending">🟡 Pending</option>
                      <option value="Cancelled">🔴 Cancel</option>
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Body Layout: Details Left + Centered QR Code Right */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left Column: Event Metadata */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Pass Holder</p>
                <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--cst-blue-400)]" />
                  {user?.email || pass?.email || pass?.person?.email}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Date &amp; Schedule</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--cst-blue-400)]" />
                  {formatDate(event.date)}
                </p>
                <p className="text-xs text-[var(--text-secondary)] pl-6">
                  {formatTime(event.startTime)} {event.endTime ? `– ${formatTime(event.endTime)}` : ''}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Venue Location</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0" />
                  <span className="truncate">{event.address || 'Venue details on confirmation'}</span>
                </p>
              </div>
            </div>

            {/* Right Column: High-Contrast Centered QR Code */}
            <div className="flex flex-col items-center justify-center p-6 bg-[var(--surface-950)] border border-[var(--border-default)] rounded-2xl text-center space-y-3">
              <QRCodeDisplay value={invitation?.qrCode || rawPassCode} size={170} />
              <p className="text-[10px] font-mono font-bold tracking-widest text-[var(--text-muted)] uppercase break-all">
                {invitation?.qrCode || rawPassCode}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                Present at turnstile for optical check-in
              </p>
            </div>
          </div>

          {/* Footer Security Badge & QuestPDF Download */}
          <div className="p-4 bg-[var(--surface-850)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Pass ID: #{pass.idPass || pass.idParticipation || pass.id || id}</span>
            {invitation?.pdfPath && (
              <a
                href={`${(import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api').replace('/api', '')}${invitation.pdfPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--cst-blue-400)] font-semibold hover:underline"
              >
                Download Official QuestPDF Ticket
              </a>
            )}
            <span>CST EventHub Engine Security Compliant</span>
          </div>
        </Card>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #root, main, .print\\:w-full, .print\\:w-full * {
            visibility: visible;
          }
          .print\\:w-full {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      {/* Official Certificate of Attendance Modal */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        event={event}
        user={user}
        pass={pass}
      />

      {/* Floating Attendee AI Concierge Widget */}
      {event && <EventAiConciergeWidget event={event} />}
    </div>
  );
};

export default DigitalPassPage;
