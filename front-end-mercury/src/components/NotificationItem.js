import React from 'react';
import {
  ShieldCheckIcon,
  TruckIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const CATEGORY_META = {
  compliance:  { Icon: ShieldCheckIcon,       color: 'text-blue-500',   bg: 'bg-blue-50'   },
  operations:  { Icon: TruckIcon,             color: 'text-green-500',  bg: 'bg-green-50'  },
  insurance:   { Icon: DocumentTextIcon,      color: 'text-purple-500', bg: 'bg-purple-50' },
  maintenance: { Icon: WrenchScrewdriverIcon, color: 'text-orange-500', bg: 'bg-orange-50' },
  load:        { Icon: ArrowPathIcon,         color: 'text-cyan-500',   bg: 'bg-cyan-50'   },
  system:      { Icon: CogIcon,              color: 'text-gray-500',   bg: 'bg-gray-50'   },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationItem({ notification, onMarkRead }) {
  const meta = CATEGORY_META[notification.category] || CATEGORY_META.system;
  const { Icon } = meta;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        notification.is_read ? 'opacity-60' : 'bg-white'
      }`}
    >
      <div className={`shrink-0 mt-0.5 h-8 w-8 rounded-full ${meta.bg} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${meta.color}`} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm text-gray-900 truncate ${notification.is_read ? 'font-normal' : 'font-semibold'}`}>
          {notification.subject || notification.category_display}
        </p>
        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{timeAgo(notification.created_at)}</span>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
            notification.channel === 'email' ? 'bg-blue-300' : 'bg-green-400'
          }`} title={notification.channel_display} />
        </div>
      </div>

      {!notification.is_read && (
        <span className="shrink-0 mt-2 h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
      )}
    </div>
  );
}
