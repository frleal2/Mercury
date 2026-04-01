import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import NotificationItem from './NotificationItem';

const CATEGORIES = [
  { key: null,          label: 'All' },
  { key: 'compliance',  label: 'Compliance' },
  { key: 'operations',  label: 'Operations' },
  { key: 'insurance',   label: 'Insurance' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'load',        label: 'Loads' },
  { key: 'system',      label: 'System' },
];

export default function NotificationCenter({
  notifications,
  unreadCount,
  loading,
  error,
  onMarkRead,
  onMarkAllRead,
  onFetchNotifications,
  onClose,
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    onFetchNotifications(activeCategory);
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleOutsideClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] flex flex-col bg-white rounded-2xl shadow-xl ring-1 ring-black/5 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {unreadCount} unread
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => setActiveCategory(key)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              activeCategory === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        )}
        {error && !loading && (
          <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <p className="text-sm">No notifications</p>
          </div>
        )}
        {!loading && !error && notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onMarkRead={onMarkRead}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2 text-center">
        <a
          href="/Settings#notifications"
          onClick={onClose}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Notification preferences
        </a>
      </div>
    </div>
  );
}
