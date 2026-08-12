import React, { useState, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Calendar, Clock, MapPin, Building2, Copy, Check, Sparkles, ArrowLeft, CheckCircle2, Clock3, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { fetchMyPasses } from '../../utils/passUtils';
import { useLanguage } from '../../context/LanguageContext';

/**
 * High-Contrast Centered QR Code Generator Component
 * Guaranteed maximum contrast (#020617 on #ffffff) for instant optical camera scanning.
 */
const QRCodeDisplay = ({ value, size = 180 }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=020617&bgcolor=ffffff`;

  return (
    <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border-4 border-slate-800 shadow-2xl transition-transform hover:scale-105">
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

const MyPassesPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);

  const { data: passes = [], isLoading, error } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return timeString ? timeString.substring(0, 5) : '';
  };

  const getPassQrPayload = (pass) => {
    if (pass?.pass?.qrCode) return pass.pass.qrCode;
    if (pass?.invitation?.qrCode) return pass.invitation.qrCode;
    if (pass?.qrCode) return pass.qrCode;

    const eventId = pass.idEvent || pass.event?.idEvent || pass.event?.id || 0;
    const personId = user?.idPerson || user?.id || pass.idPerson || 0;
    const guid = pass.guid || pass.ticketGuid || '00000000-0000-0000-0000-000000000000';
    return `EVENTHUB-${eventId}-${personId}-${guid}`;
  };

  const handleCopyPayload = (passId, payload) => {
    navigator.clipboard.writeText(payload);
    setCopiedId(passId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Status Badge Helper per Key Design Takeaways:
   * - Invited / Registered / Claimed ➔ Blue
   * - CheckedIn ➔ Green
   * - Cancelled ➔ Gray
   */
  const getStatusBadge = (pass) => {
    const rawStatus = (pass.status || (pass.checkInStatus ? 'CheckedIn' : pass.isCheckedIn ? 'CheckedIn' : pass.isCancelled ? 'Cancelled' : 'Invited')).toLowerCase();

    if (rawStatus.includes('check')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 shadow-sm shadow-emerald-900/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{t('passes.checkedIn', 'Checked In')}</span>
        </span>
      );
    }
    if (rawStatus.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800/80 border border-slate-700/60 text-slate-400">
          <Ban className="w-3 h-3 text-slate-400" />
          <span>{t('passes.cancelled', 'Cancelled')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/70 border border-blue-800/60 text-blue-400 shadow-sm shadow-blue-900/30">
        <Clock3 className="w-3 h-3 text-blue-400" />
        <span>{t('passes.invited', 'Invited')}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="cst-stagger-1 cst-hero-gradient p-6 md:p-8 rounded-3xl shadow-2xl border border-[var(--border-default)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-xs font-bold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4 text-[var(--cst-blue-400)]" />
            <span>{t('passes.digitalAccessWallet', 'Digital Access Wallet')}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{t('passes.title', 'My Event Entry Passes')}</h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1">
            {t('passes.subtitle', 'Present your high-contrast QR pass at venue turnstiles for optical camera check-in.')}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/events')}
          className="cst-btn-motion flex items-center gap-2 bg-[var(--surface-850)] hover:bg-[var(--surface-800)] text-[var(--text-primary)] border-[var(--border-default)] font-bold text-xs py-2.5 px-5 rounded-2xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--cst-blue-400)]" />
          <span>{t('passes.exploreSessions', 'Explore Sessions')}</span>
        </Button>
      </div>

      {/* Passes Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">{t('general.loading', 'Loading...')}</p>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          Failed to load your event passes. Please try again.
        </Alert>
      ) : passes.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80">
          <Ticket className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">{t('passes.noPassesClaimed', 'No Passes Claimed Yet')}</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto mb-6">
            {t('passes.noPassesDesc', "You haven't claimed passes for any upcoming events yet. Discover events in the engine directory.")}
          </p>
          <Button onClick={() => navigate('/events')}>{t('passes.exploreEvents', 'Explore Events')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {passes.map((pass, index) => {
            const passId = pass.idParticipation || pass.idPass || pass.id || index;
            const event = pass.event || {};
            const payload = getPassQrPayload(pass);

            return (
              <Card
                key={passId}
                className="cst-card-hover group flex flex-col md:flex-row overflow-hidden border-slate-800 bg-slate-900/90 shadow-xl"
              >
                {/* Central QR Code High-Contrast Side */}
                <div className="bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 min-w-[220px]">
                  <QRCodeDisplay value={payload} size={160} />
                  <span className="text-[10px] font-mono text-slate-400 mt-3 max-w-[190px] truncate text-center">
                    {payload}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyPayload(passId, payload)}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedId === passId ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>{t('passes.copiedCode', 'Copied Code')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        <span>{t('passes.copyCode', 'Copy Code')}</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Pass Details Side */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {/* Distinct badge color status: Invited ➔ Blue, CheckedIn ➔ Green, Cancelled ➔ Gray */}
                      {getStatusBadge(pass)}

                      <span className="text-xs font-mono text-slate-500">
                        {t('passes.passNumber', 'Pass #')}{passId}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-100 tracking-tight leading-snug">
                      {event.title || 'Event Pass'}
                    </h3>

                    {event.company && (
                      <div className="flex items-center gap-2 text-xs font-medium text-indigo-400 mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{event.company.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate">{event.address || 'Venue details on pass'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
                    <span>{t('passes.holder', 'Holder:')} <strong className="text-slate-200">{user?.email}</strong></span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPass(pass)}
                      className="text-xs text-indigo-400"
                    >
                      {t('passes.fullTicket', 'Full Ticket')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Centered Ticket Pass Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">{t('passes.eventPass', 'EventHub Pass')}</span>
              <button onClick={() => setSelectedPass(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center">
              <QRCodeDisplay value={getPassQrPayload(selectedPass)} size={220} />
              <p className="font-mono text-xs text-slate-400 mt-4 break-all bg-slate-950 p-2.5 rounded-xl border border-slate-800 w-full">
                {getPassQrPayload(selectedPass)}
              </p>
            </div>

            <div className="text-left bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <p className="font-bold text-slate-100">{selectedPass.event?.title}</p>
                {getStatusBadge(selectedPass)}
              </div>
              <p className="text-xs text-slate-400">{formatDate(selectedPass.event?.date)} • {formatTime(selectedPass.event?.startTime)}</p>
              <p className="text-xs text-slate-400">{selectedPass.event?.address}</p>
            </div>

            <Button onClick={() => setSelectedPass(null)} className="w-full">
              {t('passes.closeTicket', 'Close Full Ticket')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPassesPage;
