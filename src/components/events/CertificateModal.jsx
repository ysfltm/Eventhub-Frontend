import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Award, Printer, X, ShieldCheck, Calendar, MapPin, Building2, CheckCircle2, Sparkles } from 'lucide-react';
import { generateCertificateId, formatCertificateDate } from '../../utils/certificateUtils';
import { useLanguage } from '../../context/LanguageContext';
import { getRoleStyle } from '../../utils/roleUtils';

export const CertificateModal = ({
  isOpen,
  onClose,
  event,
  user,
  pass,
}) => {
  const certificateRef = useRef(null);
  const { t, dir } = useLanguage();

  if (!isOpen || !event) return null;

  const certId = generateCertificateId(event, user, pass);
  const roleStyle = getRoleStyle(user?.role);
  const issueDate = formatCertificateDate(event.date || pass?.checkInTime);
  const attendeeName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] || 'Honored Participant';

  const hostName =
    event.company?.name ||
    event.Company?.Name ||
    event.companyName ||
    'CST Solutions Intégrées Enterprise';

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `EVENTHUB-CERT:${certId}|${event.title}|${attendeeName}`
  )}&color=020617&bgcolor=ffffff`;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      dir={dir}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in"
    >
      <div className="relative w-full max-w-4xl bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Toolbar Header */}
        <div className="no-print p-4 sm:px-6 bg-[var(--surface-850)] border-b border-[var(--border-default)] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)]">
                {t('certificate.modalTitle', 'Verified Certificate of Attendance')}
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                {certId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="cst-btn-motion inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('certificate.printPdf', 'Print / Save as PDF')}</span>
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

        {/* Certificate Display Body (Landscape Canvas) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex items-center justify-center bg-slate-950/40">
          <div
            ref={certificateRef}
            className="certificate-print-area w-full max-w-3xl bg-slate-900 border-8 border-double border-amber-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center text-slate-100"
            style={{
              backgroundImage: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
            }}
          >
            {/* Corner Decorative Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400/80 rounded-tl-xl" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400/80 rounded-tr-xl" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400/80 rounded-bl-xl" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400/80 rounded-br-xl" />

            {/* Top Brand & Seal */}
            <div className="flex flex-col items-center justify-center gap-2 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-xl shadow-amber-500/20">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-amber-400 border border-amber-400/40">
                  <Award className="w-7 h-7" />
                </div>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-400">
                EventHub Corporate Ecosystem
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-100 tracking-wide">
                {t('certificate.certificateTitle', 'CERTIFICATE OF ATTENDANCE')}
              </h1>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent my-1" />
            </div>

            {/* Recipient Statement */}
            <div className="space-y-4 my-6">
              <p className="text-xs font-serif italic text-slate-400">
                {t('certificate.certifiesThat', 'This official document certifies that')}
              </p>
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 capitalize">
                  {attendeeName}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-amber-950/40 text-amber-300">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{roleStyle.label}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                {t('certificate.participationStatement', 'has successfully registered, attended, and verified participation in the executive corporate session')}
              </p>
            </div>

            {/* Event Name & Metadata */}
            <div className="bg-slate-950/70 border border-amber-500/20 rounded-2xl p-4 my-6 max-w-xl mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                {event.title}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {issueDate}
                </span>
                {event.address && (
                  <span className="flex items-center gap-1.5 truncate max-w-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{event.address}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Signatures & QR Verification Seal */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              {/* Host Organization Signature */}
              <div className="text-center sm:text-left space-y-1">
                <p className="font-serif italic text-base text-amber-300">Executive Committee</p>
                <div className="w-36 h-px bg-slate-700 mx-auto sm:mx-0" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{hostName}</p>
                <p className="text-[9px] text-slate-500">Authorized Event Organizer</p>
              </div>

              {/* QR Verification Seal */}
              <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 p-2 rounded-2xl">
                <img src={qrUrl} alt="Certificate QR Verification" className="w-14 h-14 rounded-lg bg-white p-0.5" />
                <div className="text-[9px] space-y-0.5">
                  <p className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VERIFIED PASS
                  </p>
                  <p className="font-mono text-slate-400">{certId}</p>
                  <p className="text-slate-500">Issued: {issueDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
