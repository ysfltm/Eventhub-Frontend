import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ShieldCheck,
  Calendar,
  MapPin,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  Activity,
  Brain,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const EventPerformanceReportModal = ({
  isOpen,
  onClose,
  event,
  stats,
  isSuperAdmin,
  user,
}) => {
  const { t, dir } = useLanguage();
  const reportRef = useRef(null);

  if (!isOpen) return null;

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const reportTimestamp = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const eventTitle = event?.title || t('analytics.allEvents', 'All Events Aggregated Portfolio');
  const eventDate = event?.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'All-Time / Aggregate';
  const eventLocation = event?.address || event?.location || 'CST Enterprise Headquarters';
  const hostCompany =
    event?.company?.name ||
    event?.Company?.Name ||
    event?.companyName ||
    user?.companyName ||
    'CST Solutions Intégrées Enterprise';

  const reportId = `EHR-PERF-${event?.idEvent || event?.id || 'GLOBAL'}-${Date.now().toString(36).toUpperCase()}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
    `EVENTHUB-REPORT:${reportId}|${eventTitle}|CheckInRate:${stats?.checkInRate?.toFixed(1)}%|Rating:${stats?.avgRating?.toFixed(1)}`
  )}&color=020617&bgcolor=ffffff`;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      dir={dir}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in"
    >
      <div className="relative w-full max-w-5xl bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Modal Toolbar Header (Hidden during Print) */}
        <div className="no-print p-4 sm:px-6 bg-[var(--surface-850)] border-b border-[var(--border-default)] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-[var(--cst-blue-400)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[var(--text-primary)]">
                  {t('analytics.performanceReport', 'Executive Event Performance Report')}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300">
                  {isSuperAdmin ? 'SuperAdmin Full Scope' : 'Organiser Post-Event View'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                {reportId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="cst-btn-motion inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('analytics.printReport', 'Print / Save as PDF')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Preview Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-950/50">
          <div
            ref={reportRef}
            className="report-print-area w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-slate-100 space-y-8"
          >
            {/* Top Corporate Branding Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                    EH
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--cst-blue-400)]">
                    EventHub &bull; CST Solutions Intégrées
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  {t('analytics.postEventAnalysis', 'Post-Event Performance Analysis')}
                </h1>
                <p className="text-xs text-slate-400">
                  Comprehensive audit of attendee turnout conversion, guest satisfaction ratings, and door arrival velocity.
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-400 font-mono bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <p><span className="text-slate-500">Report ID:</span> <strong className="text-slate-200">{reportId}</strong></p>
                <p><span className="text-slate-500">Generated:</span> {reportDate} @ {reportTimestamp}</p>
                <p><span className="text-slate-500">Auditor:</span> {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'Executive Admin'}</p>
              </div>
            </div>

            {/* Event Overview Metadata Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> Event Session
                </span>
                <p className="text-sm font-bold text-slate-100">{eventTitle}</p>
                <p className="text-xs text-slate-400">{eventDate}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" /> Host Organization
                </span>
                <p className="text-sm font-bold text-slate-100">{hostCompany}</p>
                <p className="text-xs text-slate-400">Enterprise Host</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Location / Venue
                </span>
                <p className="text-sm font-bold text-slate-100 truncate">{eventLocation}</p>
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Physical Session
                </p>
              </div>
            </div>

            {/* Executive KPIs Grid (6 Key Metrics) */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Key Performance Indicators (KPIs)
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Total Registrations */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Registrations
                  </span>
                  <div className="text-2xl font-black text-slate-100">
                    {stats?.totalRegistrations || 0}
                  </div>
                  <p className="text-[10px] text-slate-400">Claimed passes</p>
                </div>

                {/* 2. Check-In Rate */}
                <div className="p-3.5 bg-slate-950 border border-emerald-800/40 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Check-In Rate
                  </span>
                  <div className="text-2xl font-black text-emerald-300">
                    {stats?.checkInRate !== undefined ? `${stats.checkInRate.toFixed(1)}%` : '0.0%'}
                  </div>
                  <p className="text-[10px] text-emerald-400/90 font-medium">
                    {stats?.confirmedCheckInsCount || 0} attended
                  </p>
                </div>

                {/* 3. Missed (No-Show) Rate */}
                <div className="p-3.5 bg-slate-950 border border-amber-800/40 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Missed Rate
                  </span>
                  <div className="text-2xl font-black text-amber-300">
                    {stats?.missedRate !== undefined ? `${stats.missedRate.toFixed(1)}%` : '0.0%'}
                  </div>
                  <p className="text-[10px] text-amber-400/90 font-medium">
                    {stats?.missedCount || 0} no-shows
                  </p>
                </div>

                {/* 4. Cancelled Rate */}
                <div className="p-3.5 bg-slate-950 border border-rose-800/40 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                    Cancelled Rate
                  </span>
                  <div className="text-2xl font-black text-rose-300">
                    {stats?.cancelledRate !== undefined ? `${stats.cancelledRate.toFixed(1)}%` : '0.0%'}
                  </div>
                  <p className="text-[10px] text-rose-400/90 font-medium">
                    {stats?.cancelledCount || 0} cancelled
                  </p>
                </div>

                {/* 5. Guest Rating */}
                <div className="p-3.5 bg-slate-950 border border-amber-800/40 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Guest Rating
                  </span>
                  <div className="text-2xl font-black text-amber-300 flex items-baseline gap-1">
                    {stats?.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
                    <span className="text-xs text-slate-500 font-normal">/5</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {stats?.feedbacksCount || 0} reviews
                  </p>
                </div>

                {/* 6. Peak Velocity */}
                <div className="p-3.5 bg-slate-950 border border-indigo-800/40 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Peak Velocity
                  </span>
                  <div className="text-2xl font-black text-indigo-300">
                    {stats?.peakVelocityMax || 0}
                    <span className="text-[10px] text-slate-500 font-normal ml-0.5">/hr</span>
                  </div>
                  <p className="text-[10px] text-indigo-300/90 font-medium truncate">
                    @ {stats?.peakVelocityHour || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Turnout & Attendance Breakdown Table */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> {t('analytics.turnoutBreakdown', 'Attendance & Turnout Breakdown')}
              </h2>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3.5">Status Category</th>
                      <th className="p-3.5 text-center">Attendee Count</th>
                      <th className="p-3.5 text-center">Rate (%)</th>
                      <th className="p-3.5">Turnout Distribution Bar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {/* Checked In */}
                    <tr>
                      <td className="p-3.5 flex items-center gap-2 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Confirmed Checked-In
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-100">
                        {stats?.confirmedCheckInsCount || 0}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-400">
                        {stats?.checkInRate?.toFixed(1) || 0}%
                      </td>
                      <td className="p-3.5 w-1/3">
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, stats?.checkInRate || 0)}%` }}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Missed / No-Show */}
                    <tr>
                      <td className="p-3.5 flex items-center gap-2 text-amber-300 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Missed / No-Shows
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-100">
                        {stats?.missedCount || 0}
                      </td>
                      <td className="p-3.5 text-center font-bold text-amber-400">
                        {stats?.missedRate?.toFixed(1) || 0}%
                      </td>
                      <td className="p-3.5 w-1/3">
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, stats?.missedRate || 0)}%` }}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Cancelled */}
                    <tr>
                      <td className="p-3.5 flex items-center gap-2 text-rose-300 font-semibold">
                        <XCircle className="w-4 h-4 text-rose-400" /> Cancelled Registrations
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-100">
                        {stats?.cancelledCount || 0}
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-400">
                        {stats?.cancelledRate?.toFixed(1) || 0}%
                      </td>
                      <td className="p-3.5 w-1/3">
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, stats?.cancelledRate || 0)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2-Column Section: Velocity Timeline & Rating Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Peak Velocity Hourly Timeline */}
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" /> Check-In Velocity Timeline
                </h2>
                
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Peak Scan Velocity:</span>
                    <strong className="text-indigo-300">{stats?.peakVelocityMax || 0} scans / hour</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Peak Traffic Window:</span>
                    <strong className="text-slate-200">{stats?.peakVelocityHour || 'N/A'}</strong>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    {(stats?.peakVelocityData || []).slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-mono">{item.time}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{
                                width: stats?.peakVelocityMax
                                  ? `${(item.velocity / stats.peakVelocityMax) * 100}%`
                                  : '0%',
                              }}
                            />
                          </div>
                          <span className="font-bold text-slate-200 w-8 text-right font-mono">
                            {item.velocity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Guest Rating Breakdown */}
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Guest Rating Distribution
                </h2>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Average Rating:</span>
                    <strong className="text-amber-300">{stats?.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'} / 5.0</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Positive Sentiment:</span>
                    <strong className="text-emerald-400">{stats?.positiveSentimentPercentage || 0}%</strong>
                  </div>

                  <div className="pt-1 space-y-1.5">
                    {(stats?.ratingDistribution || []).map((r, idx) => (
                      <div key={idx} className="space-y-0.5 text-[11px]">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-mono">{r.stars}</span>
                          <span className="text-slate-400">{r.count} reviews ({r.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-400 h-full rounded-full" style={{ width: `${r.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Executive Sentiment Briefing (if available) */}
            {stats?.aiInsights && (
              <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      AI Executive Sentiment Briefing (Gemini 1.5 Flash)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">
                    {stats.aiInsights.sentimentScorePercent}% Positive Sentiment
                  </span>
                </div>
                {stats.aiInsights.summary && (
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    &ldquo;{stats.aiInsights.summary}&rdquo;
                  </p>
                )}
                {stats.aiInsights.recommendations && stats.aiInsights.recommendations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Actionable Recommendations for Future Sessions:
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                      {stats.aiInsights.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Super Admin Scope: Top Participating Companies (Only for SuperAdmin) */}
            {isSuperAdmin && stats?.topCompaniesData && stats.topCompaniesData.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" /> Top Participating Partner Organizations
                </h2>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Organization Name</th>
                        <th className="p-3 text-right">Attendee Headcount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {stats.topCompaniesData.slice(0, 5).map((comp, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-mono text-slate-500">#{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-200">{comp.company}</td>
                          <td className="p-3 text-right font-bold text-purple-300">{comp.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Signatures & QR Verification Seal */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Executive Sign-Off */}
              <div className="text-left space-y-1">
                <p className="font-serif italic text-sm text-slate-300">Executive Committee &amp; Operations Audit</p>
                <div className="w-44 h-px bg-slate-700" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{hostCompany}</p>
                <p className="text-[9px] text-slate-500">Official Event Performance Ledger</p>
              </div>

              {/* QR Verification Seal */}
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-2.5 rounded-2xl">
                <img src={qrUrl} alt="Report QR Verification" className="w-12 h-12 rounded-lg bg-white p-0.5 shrink-0" />
                <div className="text-[9px] space-y-0.5 font-mono">
                  <p className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VERIFIED AUDIT
                  </p>
                  <p className="text-slate-400">{reportId}</p>
                  <p className="text-slate-500">{reportDate}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* High-Fidelity Dedicated Print Stylesheet for PDF Export */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 12mm 15mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .report-print-area,
          .report-print-area * {
            visibility: visible !important;
          }
          .report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          .report-print-area h1,
          .report-print-area h2,
          .report-print-area h3,
          .report-print-area strong,
          .report-print-area p,
          .report-print-area span,
          .report-print-area td,
          .report-print-area th {
            color: #0f172a !important;
          }
          .report-print-area div[class*="bg-slate-950"],
          .report-print-area div[class*="bg-slate-900"] {
            background-color: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
          }
          .report-print-area table {
            border: 1px solid #cbd5e1 !important;
          }
          .report-print-area thead {
            background-color: #e2e8f0 !important;
          }
          .report-print-area td,
          .report-print-area th {
            border-bottom: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default EventPerformanceReportModal;
