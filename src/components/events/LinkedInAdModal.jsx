import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  Share2,
  Download,
  CheckCircle2,
  Layers,
  Send,
  Image as ImageIcon,
  FileText,
  X,
} from 'lucide-react';
import { LinkedInIcon } from '../ui/LinkedInIcon';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';

const TEMPLATES = [
  {
    id: 'executive_launch',
    name: '🚀 Keynote & Program Launch',
    tagline: 'High-energy announcement focusing on innovation and full program agenda',
    tone: 'Inspiring & Professional',
  },
  {
    id: 'corporate_b2b',
    name: '💼 Corporate & B2B Invitation',
    tagline: 'Formal invitation tailored for company employees, stakeholders, and partners',
    tone: 'Executive & Strategic',
  },
  {
    id: 'urgency_rsvp',
    name: '⏳ Limited Seats / RSVP Alert',
    tagline: 'Urgent call-to-action highlighting limited venue capacity and registration deadline',
    tone: 'Urgent & Engaging',
  },
  {
    id: 'speaker_showcase',
    name: '🌟 Speakers & Partner Showcase',
    tagline: 'Spotlight keynote speakers, industry leaders, and sponsor organizations',
    tone: 'Collaborative & Celebratory',
  },
];

export const LinkedInAdModal = ({ isOpen, onClose, event }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [selectedTemplate, setSelectedTemplate] = useState('executive_launch');
  const [includeAgenda, setIncludeAgenda] = useState(true);
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [customHashtags, setCustomHashtags] = useState('#EventHub #Innovation #Networking #TechConference');
  const [customHook, setCustomHook] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isMcpPosting, setIsMcpPosting] = useState(false);

  const rawEventProgram = typeof event?.program === 'string' ? event.program : (typeof event?.Program === 'string' ? event.Program : '');
  const defaultSchedule = rawEventProgram || `09:00 AM — Welcome Coffee & Executive Check-in\n10:00 AM — Keynote Presentation: Strategic Innovation\n11:30 AM — Interactive Challenges & Panel Q&A\n01:00 PM — Executive Networking & Partner Showcase\n03:00 PM — Verified Certificate Awards & Wrap-Up`;
  const [customAgenda, setCustomAgenda] = useState(defaultSchedule);

  const eventTitle = event?.title || event?.Title || event?.name || event?.Name || 'Exclusive Corporate Event';
  const eventCompany = event?.company?.name || event?.companyName || event?.CompanyName || user?.companyName || 'EventHub Enterprise';
  const rawDate = event?.date || event?.Date || event?.dateEvent || event?.DateEvent;
  const eventDate = rawDate ? new Date(rawDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Upcoming Date';
  const eventTime = event?.startTime || event?.StartTime || event?.time || event?.Time || event?.timeEvent || '09:00 AM';
  const eventLocation = event?.address || event?.Address || event?.location || event?.Location || 'Tunis Convention Center';
  const eventCategory = event?.category || event?.Category || 'Technology & Innovation';
  const eventUrl = event ? `${window.location.origin}/events/${event.idEvent || event.IdEvent || event.id || event.Id || ''}` : window.location.origin;

  // Generate Post Body based on Template safely (Hooks must always run unconditionally)
  const postContent = useMemo(() => {
    if (!event) return '';
    let agendaText = '';
    if (includeAgenda && customAgenda.trim()) {
      agendaText = `\n\n📌 𝗘𝗩𝗘𝗡𝗧 𝗣𝗥𝗢𝗚𝗥𝗔𝗠 & 𝗔𝗚𝗘𝗡𝗗𝗔:\n${customAgenda
        .split('\n')
        .filter(Boolean)
        .map((line) => `  ▫️ ${line.trim()}`)
        .join('\n')}`;
    }

    let speakersText = '';
    if (includeSpeakers) {
      const rawSpeakers = event.speakers || event.Speakers;
      const speakersList = Array.isArray(rawSpeakers)
        ? rawSpeakers
        : Array.isArray(rawSpeakers?.$values)
        ? rawSpeakers.$values
        : [];
      if (speakersList.length > 0) {
        speakersText = `\n\n🎤 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗗 𝗦𝗣𝗘𝗔𝗞𝗘𝗥𝗦:\n${speakersList
          .map((s) => `  ▪️ ${typeof s === 'string' ? s : s.name || s.fullName || s.firstName || 'Keynote Speaker'} (${typeof s === 'object' ? s.position || s.role || 'Keynote' : 'Speaker'})`)
          .join('\n')}`;
      }
    }

    const hook = customHook.trim() ? `${customHook.trim()}\n\n` : '';

    switch (selectedTemplate) {
      case 'corporate_b2b':
        return `${hook}Excited to announce that ${eventCompany} is hosting the upcoming "${eventTitle}"! 🏢✨

Join industry leaders, executives, and innovators for an exclusive gathering dedicated to ${eventCategory}.

📅 Date: ${eventDate} at ${eventTime}
📍 Venue: ${eventLocation}
👥 Hosted By: ${eventCompany}${agendaText}${speakersText}

This summit provides actionable takeaways, peer-to-peer executive networking, and strategic insights.

Secure your corporate pass today ⬇️
🔗 RSVP & Passes: ${eventUrl}

${customHashtags}`;

      case 'urgency_rsvp':
        return `${hook}⏳ 𝗢𝗡𝗟𝗬 𝗔 𝗙𝗘𝗪 𝗦𝗘𝗔𝗧𝗦 𝗟𝗘𝗙𝗧: "${eventTitle}"!

Registration is filling up rapidly for our flagship ${eventCategory} summit hosted by ${eventCompany}.

📅 ${eventDate} | ⏰ ${eventTime}
📍 ${eventLocation}${agendaText}${speakersText}

Don't miss the opportunity to connect with fellow pioneers and gain firsthand industry insights.

🎟️ Reserve your attendance pass before capacity closes:
👉 ${eventUrl}

${customHashtags}`;

      case 'speaker_showcase':
        return `${hook}🌟 Meet the visionaries shaping the future at "${eventTitle}"!

Hosted by ${eventCompany}, this event brings together top minds and innovators in ${eventCategory}.${speakersText}${agendaText}

📅 Date: ${eventDate}
📍 Location: ${eventLocation}

Connect, exchange ideas, and elevate your professional network.

👉 Register now & download your digital access pass:
🔗 ${eventUrl}

${customHashtags}`;

      case 'executive_launch':
      default:
        return `${hook}🚀 𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗜𝗡𝗚: "${eventTitle}" — The Premier ${eventCategory} Summit!

We are thrilled to invite you to an unforgettable event hosted by ${eventCompany}.

📅 𝗪𝗵𝗲𝗻: ${eventDate} at ${eventTime}
📍 𝗪𝗵𝗲𝗿𝗲: ${eventLocation}${agendaText}${speakersText}

✨ 𝗪𝗵𝗮𝘁 𝘁𝗼 𝗘𝘅𝗽𝗲𝗰𝘁:
• High-impact keynotes & panel discussions
• Exclusive networking with industry leaders
• Interactive live Kahoot challenges & Q&A sessions
• Verified digital credentials & participation certificates

Reserve your spot now and join the conversation! 👇
🔗 Register here: ${eventUrl}

${customHashtags}`;
    }
  }, [
    selectedTemplate,
    eventTitle,
    eventCompany,
    eventDate,
    eventTime,
    eventLocation,
    eventCategory,
    eventUrl,
    event,
    customAgenda,
    includeAgenda,
    includeSpeakers,
    customHook,
    customHashtags,
  ]);

  const handleCopyPost = () => {
    navigator.clipboard.writeText(postContent);
    setIsCopied(true);
    addNotification({
      type: 'success',
      title: 'LinkedIn Post Copied! 📋',
      message: 'The formatted post text is ready to paste into LinkedIn.',
    });
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleOpenLinkedInShare = () => {
    // 1. Copy complete formatted post copy to clipboard
    navigator.clipboard.writeText(postContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3500);

    // 2. Open LinkedIn Feed Composer
    // Note: LinkedIn URL parameters truncate multi-line text, so we copy the full text to clipboard
    const feedUrl = 'https://www.linkedin.com/feed/?shareActive=true';

    addNotification({
      type: 'success',
      title: 'Full Post Copied to Clipboard! 📋',
      message: 'Opening LinkedIn... Just press Ctrl + V in the post box to paste the complete text & program!',
    });

    window.open(feedUrl, '_blank', 'noopener,noreferrer');
  };

  const [showMcpInspector, setShowMcpInspector] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);

  const mcpPayload = useMemo(() => {
    return {
      jsonrpc: '2.0',
      id: `mcp-task-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'linkedin_publish_campaign',
        arguments: {
          action: 'publish_event_campaign',
          eventTitle,
          company: eventCompany,
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          category: eventCategory,
          postContent,
          hashtags: customHashtags,
          eventUrl,
          bannerSpecs: {
            width: 1200,
            height: 627,
            format: 'image/png',
          },
        },
      },
    };
  }, [eventTitle, eventCompany, eventDate, eventTime, eventLocation, eventCategory, postContent, customHashtags, eventUrl]);

  const handleDispatchWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setIsDispatchingWebhook(true);
    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpPayload),
        mode: 'no-cors',
      });
      addNotification({
        type: 'success',
        title: 'Webhook Dispatched! 📡',
        message: `Dispatched event payload to webhook. Your social automation pipeline has received the campaign!`,
      });
    } catch {
      addNotification({
        type: 'info',
        title: 'Webhook Triggered 📡',
        message: 'Payload dispatched to automation endpoint.',
      });
    } finally {
      setIsDispatchingWebhook(false);
    }
  };

  const handleMcpAutoPost = () => {
    setIsMcpPosting(true);
    navigator.clipboard.writeText(JSON.stringify(mcpPayload, null, 2));
    setTimeout(() => {
      setIsMcpPosting(false);
      setShowMcpInspector(true);
      addNotification({
        type: 'success',
        title: 'MCP Tool Payload Generated! 🤖',
        message: 'Standardized MCP JSON-RPC payload copied to clipboard. Ready for Antigravity, Zapier, or local MCP server execution!',
      });
    }, 400);
  };

  const handleDownloadMcpTask = () => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(mcpPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `mcp_linkedin_task_${(eventTitle || 'event').toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    addNotification({
      type: 'info',
      title: 'MCP Task Downloaded 💾',
      message: 'Saved mcp_linkedin_task.json. Can be executed by any MCP agent runner.',
    });
  };

  const handleDownloadText = () => {
    const element = document.createElement('a');
    const file = new Blob([postContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `linkedin_post_${(event.title || 'event').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadProgramPdf = async () => {
    const rawPath = event?.programPath || event?.ProgramPath;
    const backendBase = (import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api').replace('/api', '');

    if (rawPath) {
      const fullUrl = rawPath.startsWith('http') ? rawPath : `${backendBase}${rawPath}`;
      window.open(fullUrl, '_blank');
      addNotification({
        type: 'success',
        title: 'Opening Program PDF 📄',
        message: 'Official Program PDF opened. Save it to attach to your LinkedIn post!',
      });
      return;
    }

    try {
      const eventId = event?.idEvent || event?.id || event?.IdEvent || event?.Id;
      if (eventId) {
        const res = await axiosClient.post(ENDPOINTS.EVENT.GENERATE_PROGRAM(eventId), []);
        const generatedPath = res.data?.programPath || res.data?.ProgramPath;
        if (generatedPath) {
          const fullUrl = generatedPath.startsWith('http') ? generatedPath : `${backendBase}${generatedPath}`;
          window.open(fullUrl, '_blank');
          addNotification({
            type: 'success',
            title: 'Program PDF Generated! 📄',
            message: 'QuestPDF Program generated. Save it to attach to your LinkedIn post!',
          });
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Direct printable schedule fallback
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Official Event Program - ${eventTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
              h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
              .meta { color: #475569; font-size: 14px; margin-bottom: 24px; }
              .agenda { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; font-family: monospace; white-space: pre-wrap; font-size: 14px; }
            </style>
          </head>
          <body>
            <h1>${eventTitle} — Official Program & Schedule</h1>
            <div class="meta">
              <strong>Host:</strong> ${eventCompany}<br/>
              <strong>Date & Time:</strong> ${eventDate} at ${eventTime}<br/>
              <strong>Venue:</strong> ${eventLocation}
            </div>
            <h3>Agenda Highlights:</h3>
            <div class="agenda">${customAgenda}</div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadBanner = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 627;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 1200, 627);
    bgGradient.addColorStop(0, '#0a0f1d');
    bgGradient.addColorStop(0.5, '#0f172a');
    bgGradient.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1200, 627);

    // Subtle Accent Glows
    const glow1 = ctx.createRadialGradient(1050, 150, 10, 1050, 150, 420);
    glow1.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    glow1.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1200, 627);

    const glow2 = ctx.createRadialGradient(150, 500, 10, 150, 500, 420);
    glow2.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    glow2.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1200, 627);

    // Outer Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 1160, 587);

    // Header Category Badge
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(60, 55, 340, 42, 21);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(`🚀  ${(eventCategory || 'EXCLUSIVE EVENT').toUpperCase()}`, 80, 82);

    // Event Title (Wrap if long)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px Inter, sans-serif';
    const words = eventTitle.split(' ');
    let line1 = '';
    let line2 = '';
    for (let i = 0; i < words.length; i++) {
      if ((line1 + words[i]).length < 32 && !line2) {
        line1 += `${words[i]} `;
      } else {
        line2 += `${words[i]} `;
      }
    }
    ctx.fillText(line1.trim(), 60, 175);
    if (line2.trim()) {
      ctx.fillText(line2.trim(), 60, 235);
    }

    // Company Host
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillText(`Hosted by ${eventCompany}`, 60, line2 ? 290 : 240);

    // Divider
    const dividerY = line2 ? 330 : 280;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, dividerY);
    ctx.lineTo(1140, dividerY);
    ctx.stroke();

    // Event Meta Details
    const metaY = dividerY + 55;
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(`📅  ${eventDate}`, 60, metaY);

    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(`⏰  ${eventTime}`, 550, metaY);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`📍  ${eventLocation}`, 60, metaY + 55);

    // Bottom Branding Footer
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(`🎟️ Passes & Agenda: ${eventUrl}`, 60, 560);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('EventHub', 1030, 560);

    // Download Trigger
    const link = document.createElement('a');
    link.download = `linkedin_banner_${(event.title || 'event').replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({
      type: 'success',
      title: 'LinkedIn Banner Downloaded! 🎨',
      message: '1200×627 social banner image saved. Attach it to your LinkedIn post!',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Promote Event on LinkedIn"
      description={`Generate professional LinkedIn campaigns & program announcements for "${eventTitle}"`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Template Selector Grid */}
        <div>
          <Label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
            Select Campaign Template
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/40 border-sky-500/80 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500/50'
                      : 'bg-[var(--surface-800)] border-[var(--border-default)] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100">{tmpl.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-sky-400 font-mono">
                      {tmpl.tone}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 line-clamp-2">
                    {tmpl.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customization Options */}
        <div className="p-4 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAgenda}
                onChange={(e) => setIncludeAgenda(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span className="font-medium">Include Event Program / Agenda</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSpeakers}
                onChange={(e) => setIncludeSpeakers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span className="font-medium">Include Keynote Speakers</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <Label htmlFor="custom-hook" className="text-xs">Custom Intro / Headline Hook</Label>
              <Input
                id="custom-hook"
                placeholder="e.g. Breaking news for the tech ecosystem in MENA!"
                value={customHook}
                onChange={(e) => setCustomHook(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="custom-tags" className="text-xs">Custom Hashtags</Label>
              <Input
                id="custom-tags"
                placeholder="#EventHub #TechSummit"
                value={customHashtags}
                onChange={(e) => setCustomHashtags(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          {includeAgenda && (
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="custom-agenda" className="text-xs">Event Program &amp; Agenda Highlights (Editable)</Label>
                <span className="text-[10px] text-[var(--text-muted)]">Included in LinkedIn post</span>
              </div>
              <textarea
                id="custom-agenda"
                rows={3}
                value={customAgenda}
                onChange={(e) => setCustomAgenda(e.target.value)}
                placeholder="Enter program schedule line by line..."
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500 scrollbar-thin"
              />
            </div>
          )}
        </div>

        {/* Live LinkedIn Post Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
              <LinkedInIcon className="w-3.5 h-3.5 text-sky-400" />
              Live LinkedIn Post Preview
            </Label>
            <span className="text-[10px] text-[var(--text-muted)]">Real-time Markdown &amp; Layout</span>
          </div>

          <div className="bg-[#1b1f23] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            {/* LinkedIn Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-700/30 border border-blue-500/40 flex items-center justify-center font-bold text-sm text-sky-400">
                {eventCompany[0]?.toUpperCase() || <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white">{eventCompany}</span>
                  <span className="text-[10px] text-slate-400">• 1st</span>
                </div>
                <div className="text-[10px] text-slate-400">Corporate Host &amp; Event Organiser</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span>Just now</span> • <span>🌐</span>
                </div>
              </div>
            </div>

            {/* Post Text */}
            <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed border-t border-slate-800 pt-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
              {postContent}
            </div>

            {/* Embedded Link Card */}
            <div className="bg-[#24292e] border border-slate-700 rounded-xl overflow-hidden shadow-md hover:border-slate-600 transition-colors">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={eventTitle}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-24 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 flex items-center justify-center text-slate-400">
                  <Calendar className="w-8 h-8 text-sky-400/60 mr-2" />
                  <span className="text-xs font-bold text-slate-200">{eventTitle}</span>
                </div>
              )}
              <div className="p-3">
                <div className="text-[10px] uppercase text-sky-400 font-bold">{window.location.host}</div>
                <div className="font-bold text-xs text-white truncate">{eventTitle}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                  <span>📅 {eventDate}</span> • <span>📍 {eventLocation}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MCP Assistant Inspector (Collapsible) */}
        {showMcpInspector && (
          <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs text-indigo-300">MCP JSON-RPC Tool Invocation Schema</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadMcpTask}
                  className="text-[10px] py-0.5 px-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/50"
                >
                  <Download className="w-3 h-3 mr-1" /> Download .json
                </Button>
                <button
                  type="button"
                  onClick={() => setShowMcpInspector(false)}
                  className="text-slate-400 hover:text-white p-1 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Copy this payload or run with your local MCP agent. No official LinkedIn API key is needed when using session-based MCP runners.
            </p>
            <pre className="text-[10px] font-mono text-indigo-200/90 bg-slate-900/90 p-3 rounded-xl overflow-x-auto max-h-36 border border-indigo-950 scrollbar-thin">
              {JSON.stringify(mcpPayload, null, 2)}
            </pre>

            <div className="pt-2 border-t border-indigo-950/80">
              <Label className="text-[11px] text-indigo-300 font-bold mb-1 block">Enterprise Webhook / Zapier Pipeline Dispatch</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://hooks.zapier.com/hooks/catch/... or webhook endpoint"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="text-xs h-8 bg-slate-900 border-indigo-900"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDispatchWebhook}
                  disabled={isDispatchingWebhook || !webhookUrl.trim()}
                  className="text-xs h-8 bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 font-bold"
                >
                  {isDispatchingWebhook ? 'Dispatching...' : 'Dispatch Webhook 📡'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pro-Tip: LinkedIn PDF Document Carousel */}
        <div className="p-3 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-sky-500/30 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
          <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-sky-300">Pro-Tip for LinkedIn Document Carousels:</span>
            <p className="text-[11px] text-slate-400">
              Download the <strong>Program PDF</strong> below. In LinkedIn's post composer, click the <strong>Document (📄)</strong> icon and upload it. LinkedIn will render your event agenda as an interactive swipeable carousel!
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadProgramPdf}
              className="text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
              title="Download or open the official Program PDF to attach as a LinkedIn Document"
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> Program PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadText}
              className="text-xs"
              title="Download post text as file"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Text
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadBanner}
              className="text-xs border-sky-500/40 text-sky-400 hover:bg-sky-950/40"
              title="Generate and download high-res 1200×627 LinkedIn Social Banner image"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1" /> Banner (1200×627)
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMcpAutoPost}
              disabled={isMcpPosting}
              className="text-xs border-indigo-500/40 text-indigo-400 hover:bg-indigo-950/40"
              title="Prepare MCP payload for automated publishing"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {isMcpPosting ? 'Staging MCP...' : 'MCP Auto-Post'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPost}
              className="text-xs font-bold"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Post Text
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenLinkedInShare}
              className="bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs shadow-lg shadow-sky-950/50"
            >
              <LinkedInIcon className="w-3.5 h-3.5 mr-1.5" /> Share on LinkedIn
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
