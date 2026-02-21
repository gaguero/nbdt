'use client';

import { EnvelopeIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { StatusBadge } from './StatusBadge';

interface ThreadListItemProps {
  thread: {
    id: number;
    subject: string | null;
    status: string;
    assigned_user_name: string | null;
    account_display_name: string;
    last_message_at: string | null;
    message_count: number;
    latest_snippet: string | null;
    latest_from: string | null;
    priority: string;
  };
  isActive: boolean;
  onClick: () => void;
}

export default function ThreadListItem({ thread, isActive, onClick }: ThreadListItemProps) {
  const timeAgo = thread.last_message_at ? formatTimeAgo(thread.last_message_at) : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isActive ? 'bg-sky-50 border-l-2 border-l-sky-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-800 truncate">
              {thread.latest_from || 'Unknown'}
            </p>
            <StatusBadge status={thread.status} />
          </div>
          <p className="text-sm text-slate-700 truncate mt-0.5">
            {thread.subject || '(no subject)'}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {thread.latest_snippet || ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-slate-400">{timeAgo}</span>
          {thread.message_count > 1 && (
            <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5">{thread.message_count}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-slate-400">{thread.account_display_name}</span>
        {thread.assigned_user_name && (
          <span className="text-[10px] text-slate-500">| {thread.assigned_user_name}</span>
        )}
      </div>
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}
