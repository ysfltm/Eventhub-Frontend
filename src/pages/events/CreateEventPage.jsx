import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Sparkles,
  FileText,
  Clock,
  Building2,
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useNotification } from '../../context/NotificationContext';
import { to24HourTimeSpan, TIME_OPTIONS_24H } from '../../utils/timeUtils';

import { AddressLocationPicker } from '../../components/maps/AddressLocationPicker';

const FIELD_INPUT =
  'w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cst-blue-600)] focus:ring-2 focus:ring-[var(--cst-blue-600)]/20 transition-all';
const FIELD_LABEL =
  'block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5';

const CreateEventPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotification();

  const [programPdfFile, setProgramPdfFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    idCompany: '',
    date: '',
    startTime: '09:00',
    endTime: '18:00',
    address: '',
    person: '',
  });

  // Fetch companies for dropdown
  const { data: rawCompaniesData = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
      return res.data ?? [];
    },
  });

  const companies = Array.isArray(rawCompaniesData)
    ? rawCompaniesData
    : Array.isArray(rawCompaniesData?.data)
    ? rawCompaniesData.data
    : Array.isArray(rawCompaniesData?.$values)
    ? rawCompaniesData.$values
    : [];

  const selectedCompany = companies.find((c) => String(c.idCompany || c.id) === String(formData.idCompany));

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        title: data.title,
        Title: data.title,
        description: data.description,
        Description: data.description,
        idCompany: parseInt(data.idCompany, 10),
        IdCompany: parseInt(data.idCompany, 10),
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        Date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        startTime: to24HourTimeSpan(data.startTime),
        StartTime: to24HourTimeSpan(data.startTime),
        endTime: to24HourTimeSpan(data.endTime),
        EndTime: to24HourTimeSpan(data.endTime),
        address: data.address,
        Address: data.address,
        person: data.person || null,
        Person: data.person || null,
      };
      const res = await axiosClient.post(ENDPOINTS.EVENT.BASE, payload);
      return res.data;
    },
    onSuccess: async (resData) => {
      const newEvId = resData?.idEvent || resData?.IdEvent || resData?.id || resData?.Id;

      // If a program PDF was selected, upload it now
      if (programPdfFile && newEvId) {
        const pdfData = new FormData();
        pdfData.append('file', programPdfFile);
        try {
          await axiosClient.post(ENDPOINTS.EVENT.UPLOAD_PROGRAM(newEvId), pdfData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          try {
            await axiosClient.post(`/Event/${newEvId}/upload-program`, pdfData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch (pdfErr) {
            console.error('Program PDF upload notice:', pdfErr);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['events'] });
      addNotification({
        type: 'event_published',
        title: 'New Event Published! 📢',
        message: `"${formData.title}" has been published successfully.`,
        link: newEvId ? `/events/${newEvId}` : '/events',
      });
      navigate('/events', { state: { message: 'Event published successfully!' } });
    },
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createEventMutation.mutate(formData);
  };

  const formatDatePreview = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between cst-stagger-1">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Events Directory
        </Link>
        <span className="text-[10px] text-[var(--cst-blue-400)] font-mono uppercase tracking-widest bg-[var(--cst-blue-800)]/20 px-3 py-1 rounded-full border border-[var(--cst-blue-600)]/30">
          Studio Event Creator
        </span>
      </div>

      {/* Hero Studio Banner */}
      <div className="cst-stagger-1 cst-hero-gradient p-6 md:p-8 rounded-3xl shadow-2xl border border-[var(--border-default)]">
        <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
          <span>Interactive Event Builder Studio</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Publish Corporate Event</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Craft session details on the left and see your live interactive event card render instantly on the right.
        </p>
      </div>

      {/* 2-Column Studio Grid */}
      <div className="cst-stagger-2 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 Columns */}
        <div className="lg:col-span-7 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          {createEventMutation.isError && (
            <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>
                {createEventMutation.error?.response?.data?.message || 'Failed to publish event. Please verify required fields.'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Session Essentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-xs font-bold uppercase tracking-widest">
                <FileText className="w-4 h-4" />
                <span>1. Session Essentials</span>
              </div>

              <div>
                <label className={FIELD_LABEL}>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={createEventMutation.isPending}
                  placeholder="e.g., Annual Tech Innovation Summit 2026"
                  className={FIELD_INPUT}
                />
              </div>

              <div>
                <label className={FIELD_LABEL}>Host Enterprise *</label>
                <div className="relative">
                  <select
                    name="idCompany"
                    value={formData.idCompany}
                    onChange={handleChange}
                    required
                    disabled={createEventMutation.isPending || companiesLoading}
                    className={`${FIELD_INPUT} appearance-none pr-10 cursor-pointer`}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">
                      {companiesLoading ? 'Loading enterprise hosts...' : 'Select host enterprise...'}
                    </option>
                    {companies.map((c) => (
                      <option key={c.idCompany || c.id} value={c.idCompany || c.id} className="bg-slate-900 text-slate-100">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Building2 className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={FIELD_LABEL}>Agenda &amp; Description *</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  required
                  disabled={createEventMutation.isPending}
                  placeholder="Describe session objectives, keynotes, and expectations..."
                  className={`${FIELD_INPUT} resize-none`}
                />
              </div>

              <div>
                <label className={FIELD_LABEL}>Official Session Program (Optional PDF Upload)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setProgramPdfFile(e.target.files?.[0] || null)}
                  disabled={createEventMutation.isPending}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--cst-blue-800)]/40 file:text-[var(--cst-blue-300)] hover:file:bg-[var(--cst-blue-700)]/50 cursor-pointer"
                />
                {programPdfFile && (
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                    ✓ Program PDF Attached: {programPdfFile.name} ({(programPdfFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)]" />

            {/* Step 2: Date, Time & Location */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--cst-red-400)] text-xs font-bold uppercase tracking-widest">
                <Calendar className="w-4 h-4" />
                <span>2. Date, Time &amp; Venue</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={FIELD_LABEL}>Event Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={createEventMutation.isPending}
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}>Start Time *</label>
                  <div className="relative">
                    <select
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                      disabled={createEventMutation.isPending}
                      className={`${FIELD_INPUT} appearance-none pr-10 cursor-pointer`}
                    >
                      {TIME_OPTIONS_24H.map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-slate-100">
                          {t}
                        </option>
                      ))}
                    </select>
                    <Clock className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className={FIELD_LABEL}>End Time *</label>
                  <div className="relative">
                    <select
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                      disabled={createEventMutation.isPending}
                      className={`${FIELD_INPUT} appearance-none pr-10 cursor-pointer`}
                    >
                      {TIME_OPTIONS_24H.map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-slate-100">
                          {t}
                        </option>
                      ))}
                    </select>
                    <Clock className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className={FIELD_LABEL}>Interactive Venue Address &amp; Geo Location *</label>
                <AddressLocationPicker
                  value={formData.address}
                  onChange={(newAddress) =>
                    setFormData((prev) => ({ ...prev, address: newAddress }))
                  }
                  placeholder="Type address for autocomplete suggestions, or click/drag pin on map..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/events')}
                disabled={createEventMutation.isPending}
                className="py-2.5 px-5 bg-[var(--surface-800)] hover:bg-[var(--surface-700)] rounded-2xl text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createEventMutation.isPending || !formData.idCompany || !formData.title.trim()}
                className="cst-btn-motion py-2.5 px-6 bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] rounded-2xl text-xs font-bold text-white shadow-lg shadow-[rgba(29,86,182,0.3)] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {createEventMutation.isPending && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {createEventMutation.isPending ? 'Publishing...' : 'Publish Event Now'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Card Preview (5 Columns) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[var(--cst-blue-400)]">
            <Eye className="w-4 h-4 text-[var(--cst-blue-400)]" />
            <span>Live Session Card Preview</span>
          </div>

          <div className="bg-[var(--surface-900)] border border-[var(--border-default)] p-6 pt-8 rounded-3xl shadow-2xl space-y-4 relative overflow-hidden cst-card-hover">
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[23px] bg-gradient-to-r from-[var(--cst-blue-600)] to-[var(--cst-red-600)] z-10" />

            <div className="flex items-center justify-between gap-2 mt-2.5">
              <span className="cst-badge-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                <span className="truncate">{selectedCompany?.name || 'Enterprise Host'}</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-800)] px-2 py-0.5 rounded-md border border-[var(--border-default)]">PREVIEW</span>
            </div>

            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight">
                {formData.title.trim() || 'Untitled Session Title'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed line-clamp-3">
                {formData.description.trim() || 'Session agenda and detailed description will be previewed here in real-time as you fill out the form...'}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 text-xs text-[var(--text-secondary)] font-sans">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                <span>
                  {formatDatePreview(formData.date)} · {formData.startTime} - {formData.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--cst-red-400)] shrink-0" />
                <span className="truncate">{formData.address.trim() || 'Venue Location TBD'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Ready to Publish
              </span>
              <span className="text-xs font-bold text-[var(--cst-blue-400)] flex items-center gap-1">
                View Agenda <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;