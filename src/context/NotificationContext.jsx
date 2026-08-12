import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { ENDPOINTS } from '../api/endpoints';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'eventhub_user_notifications_v1';
const KNOWN_EVENTS_KEY = 'eventhub_known_event_ids';

// Initial demo notification seeds so bell is immediately interactive
const SEED_NOTIFICATIONS = [
  {
    id: 'seed-1',
    type: 'event_published',
    title: 'New Event Published! 🚀',
    message: 'AI & Cloud Summit 2026 has been published and open for registrations.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    read: false,
    link: '/events',
  },
  {
    id: 'seed-2',
    type: 'registration_success',
    title: 'Registration Confirmed 🎉',
    message: 'Your digital pass for Event #1 has been generated and dispatched.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: false,
    link: '/passes',
  },
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading notifications:', e);
    }
    return SEED_NOTIFICATIONS;
  });

  const [knownEventIds, setKnownEventIds] = useState(() => {
    try {
      const saved = localStorage.getItem(KNOWN_EVENTS_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error loading known event IDs:', e);
    }
    return new Set();
  });

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Error saving notifications:', e);
    }
  }, [notifications]);

  // Save known event IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KNOWN_EVENTS_KEY, JSON.stringify(Array.from(knownEventIds)));
    } catch (e) {
      console.warn('Error saving known event IDs:', e);
    }
  }, [knownEventIds]);

  // Add new notification
  const addNotification = useCallback(({ type, title, message, link }) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: type || 'info', // 'event_published' | 'registration_success' | 'checkin_success' | 'checkin_warning' | 'checkin_error'
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      link: link || null,
    };

    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Background check for newly published events to auto-trigger "New Event Published" notification
  useEffect(() => {
    const checkForNewEvents = async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
        const eventsList = Array.isArray(res.data) ? res.data : res.data?.items ?? [];

        if (eventsList.length === 0) return;

        setKnownEventIds((prevKnown) => {
          const nextKnown = new Set(prevKnown);

          if (prevKnown.size === 0) {
            // First run: register all existing event IDs without spamming notifications
            eventsList.forEach((ev) => {
              const evId = ev.idEvent || ev.id;
              if (evId) nextKnown.add(evId);
            });
            return nextKnown;
          }

          // Check if any new events appeared
          eventsList.forEach((ev) => {
            const evId = ev.idEvent || ev.id;
            if (evId && !prevKnown.has(evId)) {
              nextKnown.add(evId);
              addNotification({
                type: 'event_published',
                title: 'New Event Published! 📢',
                message: `"${ev.title || 'Untitled Event'}" is now published and open for registrations.`,
                link: `/events/${evId}`,
              });
            }
          });

          return nextKnown;
        });
      } catch {
        // Ignore network errors in background poll
      }
    };

    checkForNewEvents();
    const interval = setInterval(checkForNewEvents, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
