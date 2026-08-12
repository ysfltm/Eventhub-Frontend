import React, { useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  QrCode,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { fetchMyPasses, extractEventId, cancelParticipation, removeLocalClaimedPass } from '../../utils/passUtils';
import { useLanguage } from '../../context/LanguageContext';

const MyRegistrationsPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const {
    data: myPasses = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ eventId, participationId }) => {
      return await cancelParticipation(eventId, participationId);
    },
    onSuccess: (data, variables) => {
      const targetEvtId = variables?.eventId;
      removeLocalClaimedPass(targetEvtId, user);

      queryClient.setQueriesData({ queryKey: ['myPasses'] }, (oldData) => {
        if (!oldData) return [];
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        return list.filter((p) => extractEventId(p) !== targetEvtId);
      });

      queryClient.invalidateQueries({ queryKey: ['myPasses'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });

      alert(data?.message || 'Successfully cancelled event registration.');
    },
    onError: (err) => {
      console.error('Cancel registration error:', err);
      const serverMsg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || err.message || 'Failed to cancel registration.');
      alert(`Cancellation Alert (${err.response?.status || 'Network Error'}):\n\n${serverMsg}`);
    },
  });

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* Header Banner */}
      <div className="cst-stagger-1 cst-hero-gradient border border-[var(--border-default)] p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
            <span>{t('registrations.digitalPassWallet', 'Digital Pass Wallet')}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {t('registrations.title', 'My Event Registrations')}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md">
            {t('registrations.subtitle', 'Manage your active session registrations and QR entry passes.')}
          </p>
        </div>

        <Link to="/events">
          <Button className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-xs font-semibold">
            <Calendar className="w-4 h-4 mr-2" />
            {t('registrations.browseEvents', 'Browse Events')}
          </Button>
        </Link>
      </div>

      {/* Passes Grid */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--cst-blue-600)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">Retrieving your digital passes...</p>
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          Failed to load your event registrations. Please check connectivity.
        </Alert>
      ) : myPasses.length === 0 ? (
        <Card className="p-12 text-center bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl space-y-3">
          <Ticket className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">{t('registrations.noRegistrations', 'No Active Registrations')}</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            {t('registrations.noRegistrationsDesc', "You haven't claimed entry passes for any upcoming events yet.")}
          </p>
          <div className="pt-2">
            <Link to="/events">
              <Button size="sm">{t('registrations.browseEvents', 'Browse Events')}</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="cst-stagger-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {myPasses.map((pass) => {
            const event = pass.event || {};
            const passId = pass.idPass || pass.idParticipation;
            const isCheckedIn = Boolean(pass.checkInStatus || pass.isCheckedIn);

            return (
              <Card
                key={passId}
                className="cst-card-hover group flex flex-col justify-between p-6 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-xl space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${isCheckedIn
                        ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                        : 'bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/30 text-[var(--cst-blue-400)]'
                      }`}>
                      {isCheckedIn ? <CheckCircle2 className="w-3 h-3" /> : <Ticket className="w-3 h-3" />}
                      {isCheckedIn ? t('passes.checkedIn', 'Checked In') : t('registrations.viewPass', 'View QR Pass')}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">Pass #{passId}</span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--cst-blue-400)] transition-colors leading-snug">
                    {event.title || 'Corporate Event'}
                  </h3>

                  {event.company && (
                    <p className="text-xs font-semibold text-[var(--cst-blue-400)] flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5 cst-card-icon" />
                      <span>{event.company.name}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2 bg-[var(--surface-950)] p-3.5 rounded-2xl border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0 cst-card-icon" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0 cst-card-icon" />
                    <span>{formatTime(event.startTime)} {event.endTime ? `– ${formatTime(event.endTime)}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0 cst-card-icon" />
                    <span className="truncate">{event.address || t('general.venueDetails', 'Venue details on pass')}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Holder: {user?.email?.split('@')[0]}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        const evId = extractEventId(pass) || event.idEvent || event.id;
                        const partId = pass.idParticipation || pass.id;
                        if (confirm(`Are you sure you want to cancel registration for '${event.title}'?`)) {
                          cancelMutation.mutate({ eventId: evId, participationId: partId });
                        }
                      }}
                      disabled={isCheckedIn || cancelMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="text-xs text-[var(--cst-red-400)] border-[var(--cst-red-600)]/40 hover:bg-[var(--cst-red-700)]/20"
                      title={isCheckedIn ? 'Cannot cancel after door check-in' : 'Cancel Registration'}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      {t('registrations.cancelReg', 'Cancel')}
                    </Button>
                    <Button
                      onClick={() => navigate(`/tickets/${passId}`)}
                      size="sm"
                      className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-xs"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1.5" />
                      {t('registrations.viewPass', 'View QR Pass')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default MyRegistrationsPage;
