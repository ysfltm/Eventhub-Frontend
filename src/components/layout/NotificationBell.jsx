import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Ticket,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'event_published':
        return (
          <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-800/50 text-blue-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'registration_success':
        return (
          <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
        );
      case 'checkin_success':
        return (
          <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'checkin_warning':
        return (
          <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-800/50 text-amber-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'checkin_error':
        return (
          <div className="p-2 rounded-xl bg-red-950/70 border border-red-800/50 text-red-400 shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-800/50 text-indigo-400 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        title="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] transition-all cst-bell-hover"
      >
        <Bell size={16} aria-hidden="true" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 border border-slate-950 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-900/50 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden cst-dropdown-anim">
          {/* Header */}
          <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800/60 text-blue-400 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Bell className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-semibold text-slate-400">No notifications yet</p>
                <p className="text-[11px] text-slate-600">Events, registrations &amp; door scan alerts will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 hover:bg-slate-850/80 transition-colors cursor-pointer relative group flex gap-3 ${
                    !notif.read ? 'bg-slate-850/40 border-l-2 border-blue-500' : ''
                  }`}
                >
                  {getNotifIcon(notif.type)}

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!notif.read ? 'text-slate-100' : 'text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-blue-400 group-hover:underline">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Single Delete Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif.id);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all"
                    title="Remove notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
