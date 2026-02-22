'use client';

import { StarIcon as StarOutline, PaperClipIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import type { Thread } from '@/hooks/useEmail';

interface ThreadListItemProps {
  thread: Thread;
  isActive: boolean;
  onClick: () => void;
  onToggleStar: (e: React.MouseEvent) => void;
}

export default function ThreadListItem({ thread, isActive, onClick, onToggleStar }: ThreadListItemProps) {
  const timeAgo = thread.last_message_at ? formatTimeAgo(thread.last_message_at) : '';
  const senderName = thread.latest_from_name || thread.latest_from?.split('@')[0] || 'Unknown';
  const initials = getInitials(senderName);
  const avatarColor = getAvatarColor(thread.latest_from || '');
  const hasUnread = thread.has_unread;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left transition-all"
      style={{
        padding: '10px 12px 10px 8px',
        borderBottom: '1px solid var(--separator, #E5E2DC)',
        background: isActive
          ? 'rgba(170,142,103,0.08)'
          : hasUnread
            ? 'rgba(170,142,103,0.03)'
            : 'transparent',
        borderLeft: isActive ? '3px solid var(--gold, #AA8E67)' : '3px solid transparent',
      }}
      onMouseEnter={e => {
        if (!isActive) e.currentTarget.style.background = 'var(--elevated, #F8F6F3)';
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = hasUnread ? 'rgba(170,142,103,0.03)' : 'transparent';
        }
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: avatarColor,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            {initials}
          </div>
          {/* Star */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleStar(e); }}
            className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
            style={{
              opacity: thread.is_starred ? 1 : undefined,
              color: thread.is_starred ? '#D97706' : 'var(--muted-dim, #ACACAC)',
            }}
          >
            {thread.is_starred ? (
              <StarSolid className="h-3.5 w-3.5" />
            ) : (
              <StarOutline className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-[13px] truncate"
              style={{
                fontWeight: hasUnread ? 700 : 500,
                color: 'var(--charcoal, #3D3D3D)',
              }}
            >
              {senderName}
            </p>
            <span
              className="text-[10px] flex-shrink-0 tabular-nums"
              style={{
                color: hasUnread ? 'var(--gold, #AA8E67)' : 'var(--muted-dim, #ACACAC)',
                fontWeight: hasUnread ? 600 : 400,
              }}
            >
              {timeAgo}
            </span>
          </div>

          <p
            className="text-[12px] truncate mt-0.5"
            style={{
              fontWeight: hasUnread ? 600 : 400,
              color: hasUnread ? 'var(--charcoal, #3D3D3D)' : 'var(--muted, #8C8C8C)',
            }}
          >
            {thread.subject || '(no subject)'}
          </p>

          <p
            className="text-[11px] truncate mt-0.5"
            style={{ color: 'var(--muted-dim, #ACACAC)' }}
          >
            {thread.latest_snippet || ''}
          </p>

          {/* Bottom row: labels + metadata */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {/* Labels */}
            {thread.label_names && thread.label_names.length > 0 && thread.label_names.map((name, i) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-semibold"
                style={{
                  background: `${thread.label_colors?.[i] || '#6B7280'}18`,
                  color: thread.label_colors?.[i] || '#6B7280',
                  border: `1px solid ${thread.label_colors?.[i] || '#6B7280'}30`,
                }}
              >
                {name}
              </span>
            ))}

            {/* Message count */}
            {thread.message_count > 1 && (
              <span
                className="text-[9px] font-semibold rounded-full px-1.5 py-px"
                style={{
                  background: 'var(--elevated, #F8F6F3)',
                  color: 'var(--muted, #8C8C8C)',
                }}
              >
                {thread.message_count}
              </span>
            )}

            {/* Attachment indicator */}
            {thread.tags?.includes('has-attachments') && (
              <PaperClipIcon className="h-3 w-3" style={{ color: 'var(--muted-dim, #ACACAC)' }} />
            )}

            {/* Department badge */}
            <span className="text-[9px] ml-auto" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
              {thread.account_display_name}
            </span>
          </div>
        </div>
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
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

function getAvatarColor(email: string): string {
  const colors = [
    '#4E5E3E', '#AA8E67', '#7C6B5A', '#5B8C6B', '#8B6E5B',
    '#6B7C5E', '#9B7E5E', '#5E7E6B', '#7E5E6B', '#5E6B7E',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
