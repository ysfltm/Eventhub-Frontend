import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Clock,
  MapPin,
  Ticket,
  Award,
  ChevronDown,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';

const QUICK_STARTERS = [
  { icon: Clock, label: 'Schedule & Time', prompt: 'What is the schedule and time of this event?' },
  { icon: MapPin, label: 'Venue Location', prompt: 'Where is the venue located and how do I get there?' },
  { icon: Ticket, label: 'My QR Entry Pass', prompt: 'How do I access and use my digital QR pass?' },
  { icon: Award, label: 'Attendance Certificate', prompt: 'How do I receive my official Certificate of Attendance?' },
];

export const EventAiConciergeWidget = ({ event }) => {
  const { currentLanguage, dir } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState([]);
  const messagesEndRef = useRef(null);

  const eventId = event?.idEvent || event?.id;
  const eventTitle = event?.title || 'This Event';

  // Initial greeting message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: `👋 Hello! I am your AI Concierge for **${eventTitle}**.\n\nAsk me anything about the agenda schedule, venue location, digital QR entry passes, or certificate issuance!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, eventTitle, messages.length]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const chatMutation = useMutation({
    mutationFn: async ({ message, history }) => {
      // Ensure history sent to backend starts with a user turn (Gemini API requirement)
      const cleanHistory = (history || [])
        .filter((h) => h.content && typeof h.content === 'string')
        .map((h) => ({
          role: h.role === 'user' ? 'user' : 'model',
          content: h.content,
        }));

      // Drop any initial bot greetings from history so it starts with a user turn
      while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
        cleanHistory.shift();
      }

      const payload = {
        message,
        history: cleanHistory,
        language: currentLanguage || 'en',
      };
      const chatEndpoint = typeof ENDPOINTS.AI?.CONCIERGE_CHAT === 'function'
        ? ENDPOINTS.AI.CONCIERGE_CHAT(eventId)
        : `/AI/event/${eventId}/chat`;
      const res = await axiosClient.post(chatEndpoint, payload);
      return res.data;
    },
    onSuccess: (data) => {
      const aiReply = data?.reply || "I'm here to help! Please feel free to ask another question.";
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'model',
          content: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFallback: Boolean(data?.isFallback),
        },
      ]);
      if (Array.isArray(data?.suggestedFollowUps) && data.suggestedFollowUps.length > 0) {
        setSuggestedFollowUps(data.suggestedFollowUps);
      }
    },
    onError: (err) => {
      console.error('Concierge chat API error:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        `I had trouble connecting to the server. For **${eventTitle}**, please check the venue details at **${event?.address || 'the venue'}** or contact support.`;
      
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'model',
          content: typeof errMsg === 'string' ? errMsg : `Connection issue. Please retry your question about **${eventTitle}**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFallback: true,
        },
      ]);
    },
  });

  if (!eventId) return null;

  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || chatMutation.isPending) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSuggestedFollowUps([]);

    chatMutation.mutate({
      message: text,
      history: updatedHistory,
    });
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        content: `👋 Chat reset. What would you like to know about **${eventTitle}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSuggestedFollowUps([]);
  };

  // Simple formatter for bold text and linebreaks in responses
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lIdx} className="block min-h-[1.2em]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-[var(--text-primary)]">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div
      dir={dir}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden font-sans"
    >
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[var(--cst-blue-700)] via-indigo-600 to-purple-600 hover:from-[var(--cst-blue-600)] hover:to-purple-500 text-white font-bold text-xs shadow-2xl shadow-blue-500/40 border border-blue-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="text-left">
            <span className="block text-[11px] font-black tracking-wide leading-tight">
              Event AI Concierge
            </span>
            <span className="block text-[9px] text-blue-200 font-medium">
              Ask anything about this event
            </span>
          </div>
        </button>
      )}

      {/* Expanded Floating Chat Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[400px] h-[540px] max-h-[82vh] bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl shadow-2xl shadow-slate-950/80 flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[var(--surface-850)] via-[var(--surface-900)] to-[var(--surface-850)] border-b border-[var(--border-default)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-[var(--text-primary)] truncate">
                    {eventTitle}
                  </h4>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-md bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 shrink-0">
                    Gemini 1.5
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Concierge Assistant</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface-800)] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[var(--surface-950)]/60">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] p-3 rounded-2xl leading-relaxed text-xs space-y-1 shadow-sm ${
                      isUser
                        ? 'bg-[var(--cst-blue-700)] text-white rounded-br-none'
                        : 'bg-[var(--surface-850)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-bl-none'
                    }`}
                  >
                    <div className="break-words">{renderFormattedText(m.content)}</div>
                    <div
                      className={`text-[9px] font-mono text-right ${
                        isUser ? 'text-blue-200' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-lg bg-[var(--cst-blue-800)]/40 border border-[var(--cst-blue-500)]/40 flex items-center justify-center text-[var(--cst-blue-300)] shrink-0 mt-0.5">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {chatMutation.isPending && (
              <div className="flex items-start gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 animate-spin" />
                </div>
                <div className="p-3 bg-[var(--surface-850)] border border-[var(--border-subtle)] rounded-2xl rounded-bl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips */}
          {messages.length <= 2 && (
            <div className="px-3 pt-2 pb-1 bg-[var(--surface-900)] border-t border-[var(--border-subtle)] shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                Suggested Questions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_STARTERS.map((qs, i) => {
                  const Icon = qs.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(qs.prompt)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--surface-800)] hover:bg-[var(--surface-750)] border border-[var(--border-subtle)] hover:border-[var(--cst-blue-500)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Icon className="w-3 h-3 text-[var(--cst-blue-400)]" />
                      <span>{qs.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Follow-up suggestion chips */}
          {suggestedFollowUps.length > 0 && (
            <div className="px-3 pt-2 pb-1 bg-[var(--surface-900)] border-t border-[var(--border-subtle)] shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {suggestedFollowUps.map((fu, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(fu)}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 text-indigo-300 transition-colors cursor-pointer text-left"
                  >
                    ✨ {fu}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[var(--surface-850)] border-t border-[var(--border-default)] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about this event..."
              className="flex-1 px-3.5 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cst-blue-600)] transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || chatMutation.isPending}
              className="p-2.5 rounded-2xl bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] disabled:opacity-40 text-white transition-all cursor-pointer shrink-0 shadow-md shadow-blue-600/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default EventAiConciergeWidget;
