import React, { useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Building2,
  ArrowLeft,
  Ticket,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Star,
  FileText,
  MessageSquare,
  XCircle,
  Pencil,
  Trash2,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { AuthContext } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AddressMapTrigger } from '../../components/maps/AddressMapTrigger';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { AddressLocationPicker } from '../../components/maps/AddressLocationPicker';
import { fetchMyPasses, extractEventId, cancelParticipation, saveLocalClaimedPass, removeLocalClaimedPass } from '../../utils/passUtils';
import { getRoleStyle } from '../../utils/roleUtils';
import { isEventPassed, formatDateForInput, to24HourTimeSpan, TIME_OPTIONS_24H } from '../../utils/timeUtils';
import { useLanguage } from '../../context/LanguageContext';
import { AddToCalendarDropdown } from '../../components/events/AddToCalendarDropdown';
import { CertificateModal } from '../../components/events/CertificateModal';
import { AIFeedbackInsightsCard } from '../../components/analytics/AIFeedbackInsightsCard';
import { EventAiConciergeWidget } from '../../components/ai/EventAiConciergeWidget';
import { Award } from 'lucide-react';

const FIELD_INPUT =
  'w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cst-blue-600)] focus:ring-2 focus:ring-[var(--cst-blue-600)]/20 transition-all';
const FIELD_LABEL =
  'block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOrganiser: ctxIsOrganiser, isSuperAdmin, isStaff } = useContext(AuthContext);
  const isOrganiser = ctxIsOrganiser || isSuperAdmin;
  const canViewRoster = isStaff || isOrganiser || isSuperAdmin;
  const { addNotification } = useNotification();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // Editing state for feedback reviews
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  // Edit Event Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    idCompany: '',
    date: '',
    startTime: '09:00',
    endTime: '18:00',
    address: '',
    person: '',
    capacity: 100,
  });

  // Delete Event Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Certificate Modal state
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // 1. Fetch Event details
  const {
    data: event,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BY_ID(id));
      return res.data;
    },
  });

  // 2. Fetch participations for this specific event to calculate live attendance & spots
  const { data: rawParticipations = [] } = useQuery({
    queryKey: ['eventParticipations', id],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.BY_EVENT(id));
        return Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.$values || []);
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch companies list for Edit Modal dropdown
  const { data: rawCompaniesData = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
      return res.data ?? [];
    },
    enabled: isOrganiser,
  });

  const companiesList = Array.isArray(rawCompaniesData)
    ? rawCompaniesData
    : Array.isArray(rawCompaniesData?.data)
    ? rawCompaniesData.data
    : Array.isArray(rawCompaniesData?.$values)
    ? rawCompaniesData.$values
    : [];

  // 4. Fetch user's passes to check registration and check-in status
  const { data: myPasses = [] } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
  });

  const targetEventId = parseInt(id, 10);
  const existingPass = myPasses.find((p) => extractEventId(p) === targetEventId);
  const isRegistered = Boolean(existingPass);
  const isCheckedIn = Boolean(existingPass?.checkInTime || existingPass?.checkInStatus || existingPass?.status === 'CheckedIn');

  // Attendance and capacity metrics
  const attendeeCount = rawParticipations.length;
  const rawCap = event?.capacity !== undefined && event?.capacity !== null ? event.capacity : (event?.Capacity !== undefined && event?.Capacity !== null ? event.Capacity : 100);
  const capacity = parseInt(rawCap, 10);
  const spotsRemaining = Math.max(0, capacity - attendeeCount);
  const isEventFull = capacity === 0 || (capacity > 0 && attendeeCount >= capacity);
  const hasEventPassed = isEventPassed(event?.date || event?.Date, event?.startTime || event?.StartTime);
  const percentFilled = capacity > 0 ? Math.min(100, Math.round((attendeeCount / capacity) * 100)) : 100;

  // Helper to extract error message
  const extractErrorMessage = (err, fallbackMsg = 'An error occurred. Please try again.') => {
    if (!err) return fallbackMsg;
    const data = err.response?.data;
    if (typeof data === 'string' && data.trim().length > 0) {
      return data.trim();
    }
    if (data?.message) return data.message;
    if (data?.title) return data.title;
    if (data?.detail) return data.detail;
    if (err.message) return err.message;
    return fallbackMsg;
  };

  // Open Edit Modal with prefilled values
  const handleOpenEditModal = () => {
    if (!event) return;
    setEditFormData({
      title: event.title || event.Title || '',
      description: event.description || event.Description || '',
      idCompany: event.idCompany || event.IdCompany || event.company?.idCompany || event.company?.id || '',
      date: formatDateForInput(event.date || event.Date),
      startTime: (event.startTime || event.StartTime || '09:00:00').substring(0, 5),
      endTime: (event.endTime || event.EndTime || '18:00:00').substring(0, 5),
      address: event.address || event.Address || '',
      person: event.person || event.Person || '',
      capacity: event.capacity ?? event.Capacity ?? 100,
    });
    setIsEditModalOpen(true);
  };

  // Update Event Mutation: PUT /api/Event/{id}
  const updateEventMutation = useMutation({
    mutationFn: async (formData) => {
      const parsedCapacity = parseInt(formData.capacity, 10) > 0 ? parseInt(formData.capacity, 10) : 100;
      const payload = {
        idEvent: targetEventId,
        IdEvent: targetEventId,
        title: formData.title,
        Title: formData.title,
        description: formData.description,
        Description: formData.description,
        idCompany: formData.idCompany ? parseInt(formData.idCompany, 10) : null,
        IdCompany: formData.idCompany ? parseInt(formData.idCompany, 10) : null,
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        Date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        startTime: to24HourTimeSpan(formData.startTime),
        StartTime: to24HourTimeSpan(formData.startTime),
        endTime: to24HourTimeSpan(formData.endTime),
        EndTime: to24HourTimeSpan(formData.endTime),
        address: formData.address,
        Address: formData.address,
        person: formData.person || null,
        Person: formData.person || null,
        capacity: parsedCapacity,
        Capacity: parsedCapacity,
      };
      const res = await axiosClient.put(ENDPOINTS.EVENT.BY_ID(id), payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditModalOpen(false);
      addNotification({
        type: 'event_updated',
        title: 'Event Updated ✏️',
        message: `"${editFormData.title}" has been updated successfully.`,
      });
    },
    onError: (err) => {
      console.error('Update event error:', err);
    },
  });

  // Delete Event Mutation: DELETE /api/Event/{id}
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.delete(ENDPOINTS.EVENT.BY_ID(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsDeleteModalOpen(false);
      addNotification({
        type: 'event_deleted',
        title: 'Event Deleted 🗑️',
        message: `"${event?.title || 'Event'}" was removed from the directory.`,
      });
      navigate('/events', { state: { message: 'Event deleted successfully.' } });
    },
    onError: (err) => {
      console.error('Delete event error:', err);
      alert(`Delete Error: ${extractErrorMessage(err, 'Failed to delete event.')}`);
    },
  });

  // Cancel registration mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const partId = existingPass?.id || existingPass?.idParticipation;
      return await cancelParticipation(targetEventId, partId, user);
    },
    onSuccess: (data) => {
      removeLocalClaimedPass(targetEventId, user);
      queryClient.invalidateQueries({ queryKey: ['myPasses'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['allEventAttendeeCounts'] });
      queryClient.invalidateQueries({ queryKey: ['allParticipations'] });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', id] });
      alert(data?.message || 'Successfully cancelled event registration.');
    },
    onError: (err) => {
      if (err.response?.status === 404 || err.response?.status === 400) {
        removeLocalClaimedPass(targetEventId, user);
        queryClient.invalidateQueries({ queryKey: ['myPasses'] });
        queryClient.invalidateQueries({ queryKey: ['event', id] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['allEventAttendeeCounts'] });
        queryClient.invalidateQueries({ queryKey: ['allParticipations'] });
      }
      console.error('Cancel registration error:', err);
      alert(extractErrorMessage(err, 'Failed to cancel registration.'));
    },
  });

  // Fetch Feedback reviews and summary
  const { data: feedbackSummary } = useQuery({
    queryKey: ['feedbackSummary', id],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.FEEDBACK.EVENT_SUMMARY(id));
        return res.data;
      } catch {
        return { averageRating: 0, totalFeedbacks: 0 };
      }
    },
  });

  const { data: feedbackList = [] } = useQuery({
    queryKey: ['feedbackList', id],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.FEEDBACK.BY_EVENT(id));
        return res.data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Claim pass mutation
  const claimPassMutation = useMutation({
    mutationFn: async () => {
      const evId = parseInt(id, 10);
      const personId = parseInt(user?.idPerson || user?.id, 10);
      const userEmail = user?.email ? String(user.email).toLowerCase().trim() : '';

      const payload = {
        idEvent: evId,
        IdEvent: evId,
        type: 'Attendee',
        Type: 'Attendee',
        status: 'Invited',
        Status: 'Invited',
      };

      if (!isNaN(personId) && personId > 0) {
        payload.idPerson = personId;
        payload.IdPerson = personId;
      }
      if (userEmail) {
        payload.email = userEmail;
        payload.Email = userEmail;
      }
      if (user?.firstName || user?.lastName) {
        payload.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        payload.Name = payload.name;
      }

      const res = await axiosClient.post(ENDPOINTS.PARTICIPATION.BASE, payload);
      return res.data;
    },
    onSuccess: (data) => {
      saveLocalClaimedPass(data, id, user);
      queryClient.invalidateQueries({ queryKey: ['myPasses'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['eventParticipations', id] });
      const passId = data?.idPass || data?.idParticipation || existingPass?.idPass;
      addNotification({
        type: 'registration_success',
        title: 'Pass Registration Confirmed! 🎉',
        message: `You have successfully registered for "${event?.title || 'Event'}". Your digital ticket pass is ready.`,
        link: passId ? `/tickets/${passId}` : '/passes',
      });
      if (passId) {
        navigate(`/tickets/${passId}`);
      } else {
        navigate('/passes');
      }
    },
    onError: (err) => {
      console.error('Claim pass error:', err.response?.data || err);
      if (err.response?.status === 403) {
        const serverMsg = typeof err.response.data === 'string' ? err.response.data : (err.response.data?.message || err.response.data?.title || '');
        alert(
          `Server Access Restriction (403 Forbidden):\n\n` +
          `Your role (${user?.role || 'User'}) is currently not authorized for this operation on the backend API.\n\n` +
          (serverMsg ? `Server response: ${serverMsg}\n\n` : '') +
          `Please ensure your C# ParticipationController endpoints have [Authorize(Roles = "Attendee,VIP,Spokesperson,Speaker,Sponsor,Staff,EventOrganiser,SuperAdmin")] without leading spaces.`
        );
      }
    },
  });

  // Submit Feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      setFeedbackSuccess('');
      const res = await axiosClient.post(ENDPOINTS.FEEDBACK.BASE, {
        idEvent: parseInt(id, 10),
        rating: parseInt(rating, 10),
        comment: comment.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setFeedbackSuccess('Thank you! Your event feedback has been recorded.');
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['feedbackList', id] });
      queryClient.invalidateQueries({ queryKey: ['feedbackSummary', id] });
    },
  });

  // Update Feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ feedbackId, rating, comment }) => {
      setFeedbackSuccess('');
      const payload = {
        idFeedback: feedbackId,
        idEvent: parseInt(id, 10),
        rating: parseInt(rating, 10),
        comment: comment.trim(),
      };
      try {
        const res = await axiosClient.put(ENDPOINTS.FEEDBACK.BY_ID(feedbackId), payload);
        return res.data;
      } catch (err) {
        if (err.response?.status === 400) {
          throw err;
        }
        const res = await axiosClient.put(ENDPOINTS.FEEDBACK.BASE, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      setEditingFeedbackId(null);
      setFeedbackSuccess('Feedback updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['feedbackList', id] });
      queryClient.invalidateQueries({ queryKey: ['feedbackSummary', id] });
    },
    onError: (err) => {
      console.error('Update feedback error:', err);
    },
  });

  // Delete Feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId) => {
      if (!feedbackId) throw new Error('Feedback ID is missing.');
      try {
        const res = await axiosClient.delete(ENDPOINTS.FEEDBACK.BY_ID(feedbackId));
        return res.data;
      } catch {
        const res = await axiosClient.delete(`${ENDPOINTS.FEEDBACK.BASE}/${feedbackId}`);
        return res.data;
      }
    },
    onSuccess: (data, targetFbId) => {
      queryClient.setQueriesData({ queryKey: ['feedbackList', id] }, (oldData) => {
        if (!oldData) return [];
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        return list.filter((f) => String(f.idFeedback || f.IdFeedback || f.id || f.Id) !== String(targetFbId));
      });
      setFeedbackSuccess('Feedback review deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['feedbackList', id] });
      queryClient.invalidateQueries({ queryKey: ['feedbackSummary', id] });
    },
    onError: (err) => {
      console.error('Delete feedback error:', err);
      const serverMsg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || err.message || 'Failed to delete feedback review.');
      alert(`Delete Feedback Alert (${err.response?.status || 'Error'}):\n\n${serverMsg}`);
    },
  });

  // Generate Program PDF mutation (QuestPDF)
  const generateProgramMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post(ENDPOINTS.EVENT.GENERATE_PROGRAM(id), []);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[var(--cst-blue-600)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--text-secondary)]">Loading session agenda &amp; details...</p>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pt-6">
        <Link to="/events" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
        <Alert variant="destructive">
          {error?.response?.data?.message || 'Event not found or failed to load event details.'}
        </Alert>
      </div>
    );
  }

  const backendBase = (import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api').replace('/api', '');
  const rawPath = event.programPath || event.ProgramPath;
  const programPdfUrl = rawPath ? (rawPath.startsWith('http') ? rawPath : `${backendBase}${rawPath}`) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between cst-stagger-1">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Events List
        </Link>
        
        <div className="flex items-center gap-2">
          {isOrganiser && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditModal}
                className="cst-btn-motion text-xs text-sky-400 border-sky-800/40 hover:bg-sky-950/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{t('eventDetails.editEvent', 'Edit Event')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="cst-btn-motion text-xs text-red-400 border-red-800/40 hover:bg-red-950/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('eventDetails.deleteEvent', 'Delete')}</span>
              </Button>
            </>
          )}
          <span className="text-[10px] text-[var(--cst-blue-400)] font-mono uppercase tracking-widest bg-[var(--cst-blue-800)]/20 px-2.5 py-1 rounded-md border border-[var(--cst-blue-600)]/30">
            Event ID #{event.idEvent || event.IdEvent || id}
          </span>
        </div>
      </div>

      {/* Hero Banner Card */}
      <Card className="cst-stagger-1 cst-hero-gradient border-[var(--border-default)] p-6 md:p-8 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {(event.company || event.Company || event.companyName || event.CompanyName) ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/30 rounded-lg text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{event.company?.name || event.Company?.Name || event.companyName || event.CompanyName}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>{t('events.independentSession', 'Independent Session')}</span>
                </div>
              )}

              {hasEventPassed && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-950/50 border border-amber-800/50 rounded-lg text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  <span>{t('events.eventPassed', 'Event Passed')}</span>
                </span>
              )}

              {isEventFull && !hasEventPassed && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-950/50 border border-rose-800/50 rounded-lg text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                  <Users className="w-3 h-3" />
                  <span>{t('events.eventFull', 'Event Full')}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              {event.title || event.Title || 'Untitled Event'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {event.description || event.Description || 'No detailed agenda provided for this session.'}
            </p>

            {/* Program PDF Download link / Generator */}
            {programPdfUrl ? (
              <a
                href={programPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--cst-blue-400)] hover:underline pt-2"
              >
                <FileText className="w-4 h-4" /> Download Official Event Program (PDF)
              </a>
            ) : (
              <Button
                onClick={() => generateProgramMutation.mutate()}
                disabled={generateProgramMutation.isPending}
                size="sm"
                variant="outline"
                className="text-xs mt-2"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-[var(--cst-blue-400)]" />
                {generateProgramMutation.isPending ? 'Generating Program PDF...' : 'Download / View Session Program PDF'}
              </Button>
            )}
          </div>

          {/* Registration / Action Panel */}
          <div className="flex flex-col gap-3 shrink-0 min-w-[200px]">
            {isRegistered ? (
              <div className="space-y-2">
                <Button
                  onClick={() => navigate(existingPass ? `/tickets/${existingPass.idPass || existingPass.idParticipation}` : '/passes')}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  View Entry Ticket
                </Button>
                {isCheckedIn && (
                  <Button
                    type="button"
                    onClick={() => setIsCertModalOpen(true)}
                    className="w-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm cursor-pointer flex items-center justify-center gap-2 py-2"
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{t('certificate.viewCertificate', 'Official Certificate')}</span>
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (confirm(`Are you sure you want to cancel registration for '${event.title}'?`)) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={isCheckedIn || cancelMutation.isPending}
                  variant="outline"
                  className="w-full text-xs text-red-400 border-red-800/50 hover:bg-red-950/40 cursor-pointer"
                  title={isCheckedIn ? 'Cannot cancel after door check-in' : 'Cancel Registration'}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Registration'}
                </Button>
              </div>
            ) : hasEventPassed ? (
              <div className="space-y-1.5">
                <Button
                  disabled
                  className="w-full h-11 bg-slate-800/60 text-slate-400 border border-slate-700/50 font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{t('events.eventPassed', 'Event Passed')}</span>
                </Button>
                <p className="text-[10px] text-amber-400/90 text-center font-medium">
                  {t('eventDetails.eventPassedNotice', 'This event has concluded. Registration is closed.')}
                </p>
              </div>
            ) : isEventFull ? (
              <div className="space-y-1.5">
                <Button
                  disabled
                  className="w-full h-11 bg-rose-950/40 text-rose-400 border border-rose-800/40 font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>{t('events.eventFull', 'Event Full')}</span>
                </Button>
                <p className="text-[10px] text-rose-400/90 text-center font-medium">
                  {t('eventDetails.eventFullNotice', 'This event has reached full capacity.')}
                </p>
              </div>
            ) : (
              <Button
                onClick={() => claimPassMutation.mutate()}
                disabled={claimPassMutation.isPending}
                className="w-full h-11 bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white font-semibold cursor-pointer"
              >
                {claimPassMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    <span>Register / Claim Pass</span>
                  </div>
                )}
              </Button>
            )}

            {canViewRoster && (
              <Link to={`/events/${id}/attendees`}>
                <Button variant="outline" className="w-full h-10 text-xs cursor-pointer">
                  <ListChecks className="w-4 h-4 mr-1.5 text-[var(--cst-blue-400)]" />
                  View Attendee Roster ({attendeeCount})
                </Button>
              </Link>
            )}

            <AddToCalendarDropdown event={event} className="w-full [&>button]:w-full" />
          </div>
        </div>
      </Card>

      {/* Grid: Event Metadata & Capacity Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 cst-stagger-2">

        {/* Date & Time */}
        <Card className="cst-card-hover p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/30 text-[var(--cst-blue-400)] shrink-0">
              <Calendar className="w-5 h-5 cst-card-icon" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Date &amp; Schedule</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{formatDate(event.date)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {formatTime(event.startTime)} {event.endTime ? `– ${formatTime(event.endTime)}` : ''}
              </p>
            </div>
          </div>
        </Card>

        {/* Capacity & Attendance */}
        <Card className="cst-card-hover p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 shrink-0">
              <Users className="w-5 h-5 cst-card-icon" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Attendance &amp; Capacity</p>
              <p className="text-sm font-black text-[var(--text-primary)] mt-0.5">
                {attendeeCount} / {capacity} <span className="text-xs font-normal text-[var(--text-secondary)]">spots taken</span>
              </p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                {spotsRemaining > 0 ? `${spotsRemaining} spots remaining` : 'At maximum capacity'}
              </p>
            </div>
          </div>
          <div className="w-full bg-[var(--surface-800)] rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentFilled >= 100
                  ? 'bg-rose-500'
                  : percentFilled >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </Card>

        {/* Venue Address */}
        <Card className="cst-card-hover p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/30 text-[var(--cst-blue-400)] shrink-0">
              <MapPin className="w-5 h-5 cst-card-icon" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Venue Location</p>
              <div className="text-sm font-black text-[var(--text-primary)] mt-0.5">
                <AddressMapTrigger
                  address={event.address || 'San Francisco, CA'}
                  showIcon={false}
                  className="max-w-[200px]"
                />
              </div>
              <p className="text-xs text-[var(--cst-blue-400)] font-semibold mt-0.5 flex items-center gap-1">
                <span>View interactive map</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Ratings Summary */}
        <Card className="cst-card-hover p-5 bg-[var(--surface-900)] border-[var(--border-default)] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-400 shrink-0">
              <Star className="w-5 h-5 cst-card-icon fill-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Attendee Reviews</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                {feedbackSummary?.averageRating ? `${feedbackSummary.averageRating.toFixed(1)} / 5.0` : 'No reviews yet'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {feedbackSummary?.totalFeedbacks || 0} verified ratings
              </p>
            </div>
          </div>
        </Card>

      </div>

      {/* Error alert if claim failed */}
      {claimPassMutation.isError && (
        <Alert variant="destructive" className="cst-stagger-3">
          <AlertCircle className="w-4 h-4 mr-2" />
          {extractErrorMessage(claimPassMutation.error, 'Failed to claim digital pass. Please try again.')}
        </Alert>
      )}

      {/* ── AI Executive Feedback & Sentiment Insights ───────────────── */}
      {id && <AIFeedbackInsightsCard eventId={id} eventTitle={event.title} />}

      {/* ── Feedback & Ratings Section ───────────────── */}
      <Card className="cst-stagger-3 p-6 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--cst-blue-400)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Event Feedback &amp; Reviews</h3>
          </div>
          {isCheckedIn && (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Checked-In (Feedback Eligible)
            </span>
          )}
        </div>

        {/* Submit Review Box (Checked-In Attendees only per C# backend rule) */}
        {isCheckedIn ? (
          <div className="bg-[var(--surface-950)] p-5 rounded-2xl border border-[var(--border-default)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Leave Your Event Rating</h4>
              {user?.role && (
                (() => {
                  const myRoleStyle = getRoleStyle(user.role);
                  const RoleIcon = myRoleStyle.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${myRoleStyle.badgeClass}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      Posting as {myRoleStyle.label}
                    </span>
                  );
                })()
              )}
            </div>

            {submitFeedbackMutation.isError && (
              <Alert variant="destructive" className="text-xs">
                {extractErrorMessage(
                  submitFeedbackMutation.error,
                  'Failed to submit review. You must be checked in.'
                )}
              </Alert>
            )}

            {feedbackSuccess && (
              <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-800/40">
                {feedbackSuccess}
              </p>
            )}

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star className={`w-6 h-6 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
                </button>
              ))}
              <span className="text-xs font-semibold text-[var(--text-secondary)] ml-2">{rating} out of 5 stars</span>
            </div>

            <textarea
              rows={3}
              placeholder="Share your experience regarding session content, speakers, and organization..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cst-blue-600)]"
            />

            <Button
              onClick={() => submitFeedbackMutation.mutate()}
              disabled={submitFeedbackMutation.isPending || !comment.trim()}
              size="sm"
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-xs"
            >
              {submitFeedbackMutation.isPending ? 'Submitting Review...' : 'Submit Review'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-950)] p-4 rounded-xl border border-[var(--border-subtle)]">
            Note: Only attendees who have completed live door check-in are eligible to submit reviews for this session.
          </p>
        )}

        {/* Existing Reviews List */}
        <div className="space-y-3 pt-2">
          {feedbackList.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">No reviews submitted for this event yet.</p>
          ) : (
            feedbackList.map((fb, idx) => {
              const fbId = fb.idFeedback || fb.IdFeedback || fb.id || fb.Id || fb.id_feedback;
              const fbPersonId = fb.idPerson || fb.IdPerson || fb.person?.idPerson || fb.person?.IdPerson || fb.personId || fb.PersonId;
              const currentUserId = user?.idPerson || user?.id;

              const isMyFeedback = Boolean(
                currentUserId &&
                  (String(fbPersonId) === String(currentUserId) ||
                    (user?.email && (fb.person?.email === user.email || fb.email === user.email)))
              );

              const userIsAdmin = isSuperAdmin || user?.role === 'SuperAdmin' || user?.role === 'Super Admin';
              const canDeleteFeedback = isMyFeedback || userIsAdmin;
              const isEditingThis = Boolean(fbId && editingFeedbackId === fbId);

              const fbRole = fb.person?.role || fb.role || fb.personRole || fb.userRole || 'Attendee';
              const roleStyle = getRoleStyle(fbRole);
              const RoleIcon = roleStyle.icon;
              const authorName = fb.authorName || fb.AuthorName || (fb.person
                ? `${fb.person.firstName || ''} ${fb.person.lastName || ''}`.trim() || fb.person.email
                : fb.userName || fb.email || 'Verified Attendee');

              return (
                <div key={fbId || idx} className="p-4 bg-[var(--surface-950)] border border-[var(--border-subtle)] rounded-2xl space-y-3 text-xs shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleStyle.feedbackStyle}`}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        {roleStyle.feedbackBadge}
                      </span>

                      <span className="font-semibold text-slate-200">
                        {authorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= (isEditingThis ? editRating : fb.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                        ))}
                      </div>

                      {/* Action Buttons: Edit (Owner) & Delete (Owner or SuperAdmin) */}
                      {!isEditingThis && (
                        <div className="flex items-center gap-1">
                          {isMyFeedback && (
                            <button
                              onClick={() => {
                                setEditingFeedbackId(fbId);
                                setEditRating(fb.rating || 5);
                                setEditComment(fb.comment || '');
                              }}
                              className="p-1 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                              title="Edit Review"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteFeedback && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!fbId) {
                                  alert('Error: Review ID could not be identified.');
                                  return;
                                }
                                if (window.confirm('Are you sure you want to delete this review?')) {
                                  deleteFeedbackMutation.mutate(fbId);
                                }
                              }}
                              disabled={deleteFeedbackMutation.isPending}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete Review"
                            >
                              {deleteFeedbackMutation.isPending ? (
                                <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>

                  {isEditingThis ? (
                    <div className="space-y-3 pt-1">
                      {updateFeedbackMutation.isError && (
                        <Alert variant="destructive" className="text-xs">
                          {extractErrorMessage(
                            updateFeedbackMutation.error,
                            'Failed to update feedback review.'
                          )}
                        </Alert>
                      )}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditRating(star)}
                            className="p-0.5"
                          >
                            <Star className={`w-5 h-5 ${star <= editRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)]"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateFeedbackMutation.mutate({
                              feedbackId: fbId,
                              rating: editRating,
                              comment: editComment,
                            })
                          }
                          disabled={updateFeedbackMutation.isPending || !editComment.trim()}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1.5"
                        >
                          {updateFeedbackMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingFeedbackId(null)}
                          className="text-xs text-slate-400 px-3 py-1.5"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[var(--text-primary)] text-xs leading-relaxed pt-1">
                      {fb.comment || 'No written comment provided.'}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ── Edit Event Modal (Organisers & SuperAdmin) ───────── */}
      {isOrganiser && isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Corporate Event"
          description="Update session title, description, host, date, time, address, and capacity limit."
          maxWidth="max-w-2xl"
        >
          {updateEventMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              {extractErrorMessage(updateEventMutation.error, 'Failed to update event.')}
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateEventMutation.mutate(editFormData);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Event Title *</Label>
              <Input
                id="edit-title"
                type="text"
                value={editFormData.title}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                disabled={updateEventMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-company">Host Company</Label>
              <Select
                id="edit-company"
                value={editFormData.idCompany}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, idCompany: e.target.value }))}
                disabled={updateEventMutation.isPending}
              >
                <option value="" className="bg-slate-900 text-slate-400">Select host company (or none)...</option>
                {companiesList.map((c) => (
                  <option key={c.idCompany || c.id} value={c.idCompany || c.id} className="bg-slate-900 text-slate-100">
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Event Description *</Label>
              <textarea
                id="edit-description"
                rows={3}
                value={editFormData.description}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                required
                disabled={updateEventMutation.isPending}
                className={FIELD_INPUT}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Event Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, date: e.target.value }))}
                  required
                  disabled={updateEventMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-start">Start Time</Label>
                <Select
                  id="edit-start"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  disabled={updateEventMutation.isPending}
                >
                  {TIME_OPTIONS_24H.map((t) => (
                    <option key={t} value={t} className="bg-slate-900 text-slate-100">{t}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-end">End Time</Label>
                <Select
                  id="edit-end"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  disabled={updateEventMutation.isPending}
                >
                  {TIME_OPTIONS_24H.map((t) => (
                    <option key={t} value={t} className="bg-slate-900 text-slate-100">{t}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-capacity">Capacity Limit *</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min="1"
                  value={editFormData.capacity}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                  required
                  disabled={updateEventMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Interactive Venue Address &amp; Geo Location *</Label>
              <AddressLocationPicker
                value={editFormData.address}
                onChange={(addr) => setEditFormData((prev) => ({ ...prev, address: addr }))}
                placeholder="Type venue address or select on map..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateEventMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateEventMutation.isPending || !editFormData.title.trim()}
                className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white"
              >
                {updateEventMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Event Confirmation Modal (Organisers & SuperAdmin) ── */}
      {isOrganiser && isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={t('eventDetails.deleteConfirmTitle', 'Delete Corporate Event')}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-200 text-xs">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-300">Permanent Action Warning</p>
                <p>
                  {t(
                    'eventDetails.deleteConfirmMessage',
                    'Are you sure you want to delete this event? This action cannot be undone and will remove all registrations and sessions associated with it.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--surface-950)] border border-[var(--border-default)] rounded-xl text-xs space-y-1">
              <p className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-bold">Event to delete:</p>
              <p className="font-bold text-[var(--text-primary)]">{event.title || 'Untitled Event'}</p>
              <p className="text-[var(--text-secondary)]">{formatDate(event.date)} · ID #{event.idEvent || id}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteEventMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => deleteEventMutation.mutate()}
                disabled={deleteEventMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                {deleteEventMutation.isPending ? 'Deleting Event...' : 'Delete Event'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Certificate of Attendance Modal */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        event={event}
        user={user}
        pass={existingPass}
      />

      {/* Floating Attendee AI Concierge Widget */}
      <EventAiConciergeWidget event={event} />

    </div>
  );
};

export default EventDetailsPage;

