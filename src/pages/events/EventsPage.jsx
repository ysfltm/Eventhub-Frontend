import React, { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, MapPin, Clock, Building2, Plus, Search, Ticket, Check, X, Sparkles, XCircle, Info, Users } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { AuthContext } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Select } from '../../components/ui/Select';
import { TiltCard } from '../../components/ui/TiltCard';
import { MagneticIcon } from '../../components/ui/MagneticIcon';
import { AddressMapTrigger } from '../../components/maps/AddressMapTrigger';
import { useNavigate, Link } from 'react-router-dom';
import { to24HourTimeSpan, TIME_OPTIONS_24H, isEventPassed } from '../../utils/timeUtils';
import { useLanguage } from '../../context/LanguageContext';
import { fetchMyPasses, extractEventId, cancelParticipation, saveLocalClaimedPass, removeLocalClaimedPass } from '../../utils/passUtils';

const EventsPage = () => {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [passClaimedEventId, setPassClaimedEventId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    idCompany: '',
    date: '',
    startTime: '',
    endTime: '',
    address: '',
    capacity: 100,
  });
  const [formError, setFormError] = useState('');

  const canCreateEvents = isSuperAdmin;

  // Fetch all events
  const { data: rawEventsData = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.EVENT.BASE);
      return response.data;
    },
  });

  const eventsList = Array.isArray(rawEventsData)
    ? rawEventsData
    : Array.isArray(rawEventsData?.data)
    ? rawEventsData.data
    : Array.isArray(rawEventsData?.$values)
    ? rawEventsData.$values
    : [];

  // Fetch participations for all listed events using the reliable /Participation/event/{id} endpoint
  const { data: attendeeCountsMap = {} } = useQuery({
    queryKey: ['allEventAttendeeCounts', eventsList.map((e) => extractEventId(e) || e.idEvent || e.id).join(',')],
    queryFn: async () => {
      const ids = eventsList
        .map((e) => extractEventId(e) || e.idEvent || e.IdEvent || e.id || e.Id)
        .filter(Boolean);

      if (ids.length === 0) return {};

      const countMap = {};
      const results = await Promise.allSettled(
        ids.map(async (evId) => {
          const res = await axiosClient.get(ENDPOINTS.PARTICIPATION.BY_EVENT(evId));
          const list = Array.isArray(res.data)
            ? res.data
            : (res.data?.items || res.data?.$values || res.data?.data || []);
          return { evId, count: list.length };
        })
      );

      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          countMap[r.value.evId] = r.value.count;
        }
      });

      return countMap;
    },
    enabled: eventsList.length > 0,
  });

  // Fetch companies dropdown
  const { data: rawCompaniesData = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
      return response.data;
    },
    enabled: canCreateEvents,
  });

  const companiesList = Array.isArray(rawCompaniesData)
    ? rawCompaniesData
    : Array.isArray(rawCompaniesData?.data)
    ? rawCompaniesData.data
    : Array.isArray(rawCompaniesData?.$values)
    ? rawCompaniesData.$values
    : [];

  // Fetch my active passes to mark claimed events
  const { data: rawMyPasses = [] } = useQuery({
    queryKey: ['myPasses', user?.idPerson || user?.id || user?.email],
    queryFn: () => fetchMyPasses(user),
  });

  const myPassesList = Array.isArray(rawMyPasses)
    ? rawMyPasses
    : Array.isArray(rawMyPasses?.data)
    ? rawMyPasses.data
    : Array.isArray(rawMyPasses?.$values)
    ? rawMyPasses.$values
    : [];

  const claimedEventIds = new Set(
    myPassesList.map((p) => extractEventId(p)).filter((id) => id !== null && id !== undefined)
  );

  // Mutation for creating event
  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const parsedCapacity = parseInt(eventData.capacity, 10) > 0 ? parseInt(eventData.capacity, 10) : 100;
      const payload = {
        title: eventData.title,
        Title: eventData.title,
        description: eventData.description,
        Description: eventData.description,
        idCompany: parseInt(eventData.idCompany, 10),
        IdCompany: parseInt(eventData.idCompany, 10),
        date: eventData.date ? new Date(eventData.date).toISOString() : new Date().toISOString(),
        Date: eventData.date ? new Date(eventData.date).toISOString() : new Date().toISOString(),
        startTime: to24HourTimeSpan(eventData.startTime),
        StartTime: to24HourTimeSpan(eventData.startTime),
        endTime: to24HourTimeSpan(eventData.endTime),
        EndTime: to24HourTimeSpan(eventData.endTime),
        address: eventData.address,
        Address: eventData.address,
        capacity: parsedCapacity,
        Capacity: parsedCapacity,
      };
      const response = await axiosClient.post(ENDPOINTS.EVENT.BASE, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        idCompany: '',
        date: '',
        startTime: '',
        endTime: '',
        address: '',
        capacity: 100,
      });
      setFormError('');
    },
    onError: (error) => {
      setFormError(error.response?.data?.message || 'Failed to create event. Check required fields.');
    },
  });

  // Mutation for claiming pass
  const claimPassMutation = useMutation({
    mutationFn: async (idEvent) => {
      const evId = parseInt(idEvent, 10);
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

      const response = await axiosClient.post(ENDPOINTS.PARTICIPATION.BASE, payload);
      return response.data;
    },
    onSuccess: (data, idEvent) => {
      saveLocalClaimedPass(data, idEvent, user);
      queryClient.invalidateQueries({ queryKey: ['myPasses'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['allEventAttendeeCounts'] });
      queryClient.invalidateQueries({ queryKey: ['allParticipations'] });
      setPassClaimedEventId(idEvent);
      setTimeout(() => setPassClaimedEventId(null), 3000);
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
        return;
      }
      let errorMsg = 'Failed to claim pass for this event.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else if (err.response.data.title) {
          errorMsg = err.response.data.title;
        } else if (err.response.data.errors) {
          errorMsg = Object.entries(err.response.data.errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      alert(`API Error (${err.response?.status || 'Network'}):\n${errorMsg}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ eventId, participationId }) => {
      return await cancelParticipation(eventId, participationId, user);
    },
    onSuccess: (data, variables) => {
      const targetEvtId = variables?.eventId;
      removeLocalClaimedPass(targetEvtId, user);

      // Instantly update local passes cache for optimistic UI responsiveness
      queryClient.setQueriesData({ queryKey: ['myPasses'] }, (oldData) => {
        if (!oldData) return [];
        const list = Array.isArray(oldData) ? oldData : (oldData?.data || oldData?.$values || []);
        return list.filter((p) => extractEventId(p) !== targetEvtId);
      });

      queryClient.invalidateQueries({ queryKey: ['myPasses'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['allEventAttendeeCounts'] });
      queryClient.invalidateQueries({ queryKey: ['allParticipations'] });

      alert(data?.message || 'Successfully cancelled event registration.');
    },
    onError: (err, variables) => {
      const targetEvtId = variables?.eventId;
      if (err.response?.status === 404 || err.response?.status === 400) {
        removeLocalClaimedPass(targetEvtId, user);
        queryClient.invalidateQueries({ queryKey: ['myPasses'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['allEventAttendeeCounts'] });
        queryClient.invalidateQueries({ queryKey: ['allParticipations'] });
      }
      console.error('Cancel registration error:', err);
      const serverMsg = typeof err.response?.data === 'string'
        ? err.response.data
        : (err.response?.data?.message || err.message || 'Failed to cancel registration.');
      alert(`Cancellation Alert (${err.response?.status || 'Network Error'}):\n\n${serverMsg}`);
    },
  });

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    createEventMutation.mutate(formData);
  };

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

  // Company-scoped Event Filtering
  const userCompanyId = user?.idCompany || user?.companyId;
  const isScopedToCompany = !isSuperAdmin && Boolean(userCompanyId);

  const filteredEvents = eventsList.filter((evt) => {
    if (!evt) return false;

    const evtCompanyId = evt.idCompany || evt.IdCompany || evt.company?.idCompany || evt.company?.IdCompany;

    // 1. Strict Company Isolation for non-superadmins (Organisers, Attendees, Staff, etc.)
    if (isScopedToCompany && evtCompanyId && String(evtCompanyId) !== String(userCompanyId)) {
      return false;
    }

    // 2. Admin Company Filter selector
    if (selectedCompanyFilter && evtCompanyId && String(evtCompanyId) !== String(selectedCompanyFilter)) {
      return false;
    }

    // 3. Text Search Query
    const q = (searchQuery || '').toLowerCase();
    const title = (evt.title || evt.Title || '').toLowerCase();
    const desc = (evt.description || evt.Description || '').toLowerCase();
    const addr = (evt.address || evt.Address || '').toLowerCase();
    const compName = (evt.companyName || evt.CompanyName || evt.company?.name || evt.company?.Name || (typeof evt.company === 'string' ? evt.company : '')).toLowerCase();

    return (
      title.includes(q) ||
      desc.includes(q) ||
      addr.includes(q) ||
      compName.includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Banner */}
        <div className="cst-stagger-1 cst-hero-gradient p-6 md:p-8 rounded-3xl shadow-2xl border border-[var(--border-default)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-xs font-bold uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4 text-[var(--cst-blue-400)]" />
              <span>{t('events.badge', 'Enterprise Event Directory')}</span>
              {isScopedToCompany && (
                <span className="bg-[var(--cst-blue-900)]/60 text-[var(--cst-blue-300)] px-2.5 py-0.5 rounded-full text-[10px] border border-[var(--cst-blue-700)]/50">
                  🏢 {user?.companyName || 'Company'} View
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              {t('events.title', 'Explore Corporate Events & Summits')}
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1">
              {isScopedToCompany
                ? 'Displaying events hosted specifically for your organization.'
                : t('events.subtitle', 'Discover upcoming technology conferences, keynote sessions, and claim your digital entry pass.')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canCreateEvents && (
              <Button
                onClick={() => {
                  if (isScopedToCompany && !formData.idCompany) {
                    setFormData((prev) => ({ ...prev, idCompany: String(userCompanyId) }));
                  }
                  setShowCreateForm(!showCreateForm);
                }}
                className="cst-btn-motion flex items-center gap-2 bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-lg shadow-[rgba(29,86,182,0.3)] cursor-pointer"
              >
                <Plus className="h-4 w-4 text-white" />
                <span>{showCreateForm ? t('general.close', 'Close Form') : t('events.createNew', 'Publish New Event')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={t('general.searchPlaceholder', 'Search sessions by title, description, address, or host company...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-800 bg-slate-950/60 text-slate-100"
            />
          </div>

          {/* Company Filter / Scoped Badge */}
          {isScopedToCompany ? (
            <div className="px-3.5 py-2.5 bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-300 font-bold rounded-xl flex items-center gap-2 shrink-0">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>{user?.companyName || 'My Company'}</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono">Scoped</span>
            </div>
          ) : (
            isSuperAdmin && companiesList.length > 0 && (
              <div className="w-full sm:w-64 shrink-0">
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">🏢 All Hosting Companies</option>
                  {companiesList.map((c) => {
                    const cId = c.idCompany || c.IdCompany || c.id;
                    const cName = c.name || c.Name;
                    return (
                      <option key={cId} value={cId}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )
          )}
        </div>

        {/* Create Event Form Drawer / Modal */}
        {canCreateEvents && showCreateForm && (
          <Card className="border-indigo-500/30 bg-slate-900/90 shadow-2xl shadow-indigo-950/20 animate-in fade-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-indigo-400">Host New Event</CardTitle>
                <CardDescription>Enter details to publish event to attendee dashboard</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </Button>
            </CardHeader>
            <CardContent>
              {formError && (
                <Alert variant="destructive" className="mb-4">
                  {formError}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      name="title"
                      type="text"
                      placeholder="e.g. Next-Gen Cloud Architecture Summit"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      disabled={createEventMutation.isPending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="idCompany">Host Company</Label>
                    {isScopedToCompany ? (
                      <div className="w-full p-2.5 bg-slate-950/60 border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span>{user?.companyName || 'My Company'}</span>
                      </div>
                    ) : (
                      <Select
                        id="idCompany"
                        name="idCompany"
                        value={formData.idCompany}
                        onChange={handleInputChange}
                        required
                        disabled={createEventMutation.isPending || companiesLoading}
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Select host enterprise...</option>
                        {companiesList.map((company) => (
                          <option key={company.idCompany || company.id} value={company.idCompany || company.id} className="bg-slate-900 text-slate-200">
                            {company.name || company.Name || 'Enterprise Host'}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Event Description</Label>
                  <Input
                    id="description"
                    name="description"
                    type="text"
                    placeholder="Brief agenda, keynote speakers, and session topics..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    disabled={createEventMutation.isPending}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Event Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      disabled={createEventMutation.isPending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="startTime">Start Time (24h)</Label>
                    <Select
                      id="startTime"
                      name="startTime"
                      value={formData.startTime || '09:00'}
                      onChange={handleInputChange}
                      required
                      disabled={createEventMutation.isPending}
                    >
                      {TIME_OPTIONS_24H.map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-slate-100">
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="endTime">End Time (24h)</Label>
                    <Select
                      id="endTime"
                      name="endTime"
                      value={formData.endTime || '18:00'}
                      onChange={handleInputChange}
                      required
                      disabled={createEventMutation.isPending}
                    >
                      {TIME_OPTIONS_24H.map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-slate-100">
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="capacity">Max Capacity</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      placeholder="100"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      required
                      disabled={createEventMutation.isPending}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address">Venue Address</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="e.g. Silicon Convention Center, Suite 400"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    disabled={createEventMutation.isPending}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={createEventMutation.isPending}
                    className="flex-1 h-11"
                  >
                    {createEventMutation.isPending ? 'Publishing Event...' : 'Publish Event'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={createEventMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Events Grid */}
        {eventsLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Synchronizing live event roster...</p>
            </div>
          </div>
        ) : eventsError ? (
          <Alert variant="destructive">
            Failed to connect to EventHub service. Please verify backend API status.
          </Alert>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80">
            <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-200">No events matched</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try clearing your search query to see all listed events.' : 'No scheduled events available at this time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const evtId = extractEventId(evt) || evt?.idEvent || evt?.IdEvent || evt?.id || evt?.Id;
              const matchingPass = (myPassesList || []).find((p) => extractEventId(p) === evtId);
              const isAlreadyClaimed = claimedEventIds.has(evtId);
              const isJustClaimed = passClaimedEventId === evtId;

              const title = evt.title || evt.Title || 'Untitled Event';
              const description = evt.description || evt.Description || 'No detailed agenda description provided.';
              const date = evt.date || evt.Date;
              const startTime = evt.startTime || evt.StartTime;
              const endTime = evt.endTime || evt.EndTime;
              const address = evt.address || evt.Address;
              const rawCap = evt.capacity !== undefined && evt.capacity !== null ? evt.capacity : (evt.Capacity !== undefined && evt.Capacity !== null ? evt.Capacity : 100);
              const capacity = parseInt(rawCap, 10);
              const attendeesCount = attendeeCountsMap[evtId] || evt.attendeesCount || evt.attendeeCount || evt.participations?.length || 0;
              const isFull = capacity === 0 || (capacity > 0 && attendeesCount >= capacity);
              const companyName = evt.companyName || evt.CompanyName || evt.company?.name || evt.company?.Name || (typeof evt.company === 'string' ? evt.company : null);
              const isPassed = isEventPassed(date, startTime);

              return (
                <TiltCard 
                  key={evtId || title} 
                  className="group flex flex-col justify-between bg-[var(--surface-900)] border border-[var(--border-default)] hover:border-[var(--cst-blue-500)] rounded-3xl p-6 pt-6 shadow-xl cst-card-hover relative overflow-hidden transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {companyName ? (
                        <span className="cst-badge-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1.5 shadow-sm">
                          <Building2 className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {companyName}
                          </span>
                        </span>
                      ) : (
                        <span className="cst-badge-red px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {t('events.independentSession', 'Independent Session')}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {isPassed ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-md">
                            {t('events.eventPassed', 'Event Passed')}
                          </span>
                        ) : isFull ? (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/50 border border-rose-800/40 px-2 py-0.5 rounded-md">
                            {t('events.eventFull', 'Event Full')}
                          </span>
                        ) : null}
                        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-800)] px-2 py-0.5 rounded-md border border-[var(--border-default)]">
                          #{evtId}
                        </span>
                      </div>
                    </div>

                    <Link to={`/events/${evtId}`}>
                      <h3 className="text-base font-black text-[var(--text-primary)] group-hover:text-[var(--cst-blue-400)] transition-colors line-clamp-2 leading-snug cursor-pointer">
                        {title}
                      </h3>
                    </Link>

                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      {description}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)] font-sans">
                      <div className="flex items-center gap-2.5">
                        <MagneticIcon maxShift={10} scaleOnHover={1.2}>
                          <Calendar className="h-4 w-4 text-[var(--cst-blue-400)] shrink-0 transition-transform group-hover:rotate-6" />
                        </MagneticIcon>
                        <span>{formatDate(date)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MagneticIcon maxShift={10} scaleOnHover={1.2}>
                          <Clock className="h-4 w-4 text-[var(--cst-blue-400)] shrink-0 transition-transform group-hover:-rotate-6" />
                        </MagneticIcon>
                        <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MagneticIcon maxShift={10} scaleOnHover={1.15}>
                          <Users className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isFull ? 'text-rose-400' : 'text-emerald-400'}`} />
                        </MagneticIcon>
                        <span className={`text-xs ${isFull ? 'text-rose-400 font-semibold' : 'text-[var(--text-secondary)]'}`}>
                          {attendeesCount} / {capacity} {t('events.spotsTaken', 'spots taken')} {isFull ? `(${t('events.eventFull', 'Full')})` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MagneticIcon maxShift={10} scaleOnHover={1.15}>
                          <AddressMapTrigger
                            address={address || 'San Francisco, CA'}
                            showIcon={true}
                            className="text-xs text-[var(--text-secondary)] font-sans max-w-[220px]"
                          />
                        </MagneticIcon>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    {isAlreadyClaimed || isJustClaimed ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          variant="outline"
                          onClick={() => navigate('/passes')}
                          className="cst-btn-motion flex-1 border-emerald-800/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 text-xs font-bold py-2 rounded-2xl cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          <span>{t('events.passClaimed', 'Pass Claimed')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${evtId}`);
                          }}
                          className="cst-btn-motion text-xs text-sky-400 border-sky-800/40 hover:bg-sky-950/40 p-2 rounded-2xl shrink-0 cursor-pointer"
                          title="View Session Details"
                        >
                          <Info className="w-4 h-4 text-sky-400" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const displayTitle = title || evt.title || evt.Title || 'this event';
                            const partId = matchingPass?.idParticipation || matchingPass?.idPass || matchingPass?.id;
                            if (window.confirm(`Are you sure you want to cancel registration for '${displayTitle}'?`)) {
                              cancelMutation.mutate({
                                eventId: evtId,
                                participationId: partId,
                              });
                            }
                          }}
                          disabled={cancelMutation.isPending}
                          className="cst-btn-motion text-xs text-red-400 border-red-800/40 hover:bg-red-950/40 p-2 rounded-2xl shrink-0 cursor-pointer"
                          title="Cancel Event Registration"
                        >
                          {cancelMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </Button>
                      </div>
                    ) : isPassed ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          disabled
                          className="flex-1 bg-slate-800/60 text-slate-400 font-bold text-xs py-2.5 rounded-2xl border border-slate-700/50 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-slate-500" />
                          <span>{t('events.eventPassed', 'Event Passed')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${evtId}`);
                          }}
                          className="cst-btn-motion text-xs text-sky-400 border-sky-800/40 hover:bg-sky-950/40 p-2.5 rounded-2xl shrink-0 cursor-pointer"
                          title="View Session Details"
                        >
                          <Info className="w-4 h-4 text-sky-400" />
                        </Button>
                      </div>
                    ) : isFull ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          disabled
                          className="flex-1 bg-rose-950/40 text-rose-400 font-bold text-xs py-2.5 rounded-2xl border border-rose-800/40 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Users className="w-4 h-4 text-rose-400" />
                          <span>{t('events.eventFull', 'Event Full')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${evtId}`);
                          }}
                          className="cst-btn-motion text-xs text-sky-400 border-sky-800/40 hover:bg-sky-950/40 p-2.5 rounded-2xl shrink-0 cursor-pointer"
                          title="View Session Details"
                        >
                          <Info className="w-4 h-4 text-sky-400" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          onClick={() => claimPassMutation.mutate(evtId)}
                          disabled={claimPassMutation.isPending}
                          className="cst-btn-motion flex-1 bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white font-bold text-xs py-2.5 rounded-2xl shadow-lg shadow-[rgba(29,86,182,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Ticket className="w-4 h-4" />
                          <span>{t('events.claimPass', 'Claim Digital Pass')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${evtId}`);
                          }}
                          className="cst-btn-motion text-xs text-sky-400 border-sky-800/40 hover:bg-sky-950/40 p-2.5 rounded-2xl shrink-0 cursor-pointer"
                          title="View Session Details"
                        >
                          <Info className="w-4 h-4 text-sky-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* Detailed Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Event Specification</span>
                  <h2 className="text-2xl font-bold text-slate-100 mt-1">{selectedEvent.title}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </Button>
              </div>

              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-sm">
                <div className="flex items-center gap-3 text-slate-300">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Host Enterprise:</span>
                  <span className="text-slate-400">{selectedEvent.company?.name || 'Standard Host'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Scheduled Date:</span>
                  <span className="text-slate-400">{formatDate(selectedEvent.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Time Window:</span>
                  <span className="text-slate-400">{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Venue Location:</span>
                  <span className="text-slate-400">{selectedEvent.address}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Description</h4>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    claimPassMutation.mutate(selectedEvent.idEvent);
                    setSelectedEvent(null);
                  }}
                  disabled={claimedEventIds.has(selectedEvent.idEvent) || claimPassMutation.isPending}
                  className="flex-1 h-11"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  {claimedEventIds.has(selectedEvent.idEvent) ? 'Pass Already Claimed' : 'Claim Pass Now'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
};

export default EventsPage;

