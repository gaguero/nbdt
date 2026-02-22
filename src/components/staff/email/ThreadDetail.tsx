'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUturnLeftIcon,
  ChevronDownIcon,
  StarIcon as StarOutline,
  ArchiveBoxIcon,
  TagIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { useEmailThread, useEmailActions } from '@/hooks/useEmail';
import MessageBubble from './MessageBubble';
import ComposeEmail from './ComposeEmail';
import EmailActivityLog from './EmailActivityLog';
import { StatusBadge, PriorityBadge } from './StatusBadge';

interface ThreadDetailProps {
  threadId: number;
  onUpdate: () => void;
  onBack?: () => void;
}

export default function ThreadDetail({ threadId, onUpdate, onBack }: ThreadDetailProps) {
  const { data, loading, error, refetch } = useEmailThread(threadId);
  const { reply, updateThread, markRead, toggleStar, archiveThread } = useEmailActions();
  const [showReply, setShowReply] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // Mark messages as read when opening thread
  useEffect(() => {
    if (data?.messages) {
      for (const msg of data.messages) {
        if (!msg.is_read && msg.direction === 'inbound') {
          markRead(msg.id, true);
        }
      }
    }
  }, [data?.messages, markRead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--gold, #AA8E67)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px]" style={{ color: 'var(--terra, #EC6C4B)' }}>{error || 'Thread not found'}</p>
      </div>
    );
  }

  const { thread, messages, activity } = data;
  const lastInboundMsg = [...messages].reverse().find(m => m.direction === 'inbound');

  const handleStatusChange = async (newStatus: string) => {
    await updateThread(threadId, { status: newStatus });
    setShowStatusDropdown(false);
    refetch();
    onUpdate();
  };

  const handleReply = async (replyData: {
    to: string[];
    cc?: string[];
    bodyText: string;
    bodyHtml: string;
    fromAlias?: string;
  }) => {
    await reply(threadId, {
      ...replyData,
      messageId: lastInboundMsg?.id,
    });
    setShowReply(false);
    refetch();
    onUpdate();
  };

  const handleToggleStar = async () => {
    await toggleStar(threadId, !thread.is_starred);
    refetch();
    onUpdate();
  };

  const handleArchive = async () => {
    await archiveThread(threadId);
    refetch();
    onUpdate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: 48,
          borderBottom: '1px solid var(--separator, #E5E2DC)',
          background: 'var(--surface, #fff)',
        }}
      >
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--muted, #8C8C8C)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleStar}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: thread.is_starred ? '#D97706' : 'var(--muted, #8C8C8C)' }}
            onMouseEnter={e => {
              if (!thread.is_starred) e.currentTarget.style.background = 'var(--elevated, #F8F6F3)';
            }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {thread.is_starred ? <StarSolid className="h-4 w-4" /> : <StarOutline className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleArchive}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--muted, #8C8C8C)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title="Archive"
          >
            <ArchiveBoxIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--muted, #8C8C8C)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title="Labels"
          >
            <TagIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <StatusBadge status={thread.status} />
              <ChevronDownIcon className="h-3 w-3" style={{ color: 'var(--muted-dim, #ACACAC)' }} />
            </button>
            {showStatusDropdown && (
              <div
                className="absolute top-full right-0 mt-1 rounded-lg py-1 z-10"
                style={{
                  background: 'var(--surface, #fff)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
                  minWidth: 100,
                }}
              >
                {['open', 'pending', 'closed'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className="block w-full text-left px-3 py-1.5 text-[12px] capitalize transition-colors"
                    style={{ color: 'var(--charcoal, #3D3D3D)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <PriorityBadge priority={thread.priority} />
        </div>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {/* Subject */}
          <div>
            <h2
              className="text-[16px] font-bold"
              style={{ color: 'var(--charcoal, #3D3D3D)', letterSpacing: '-0.02em', lineHeight: 1.3 }}
            >
              {thread.subject || '(no subject)'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {thread.assigned_user_name && (
                <span className="text-[10px]" style={{ color: 'var(--muted, #8C8C8C)' }}>
                  Assigned to {thread.assigned_user_name}
                </span>
              )}
              {thread.guest_name && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--gold, #AA8E67)' }}
                >
                  Linked: {thread.guest_name}
                </span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                via {thread.account_display_name}
              </span>
              {/* Label chips */}
              {thread.label_names && thread.label_names.length > 0 && thread.label_names.map((name: string, i: number) => (
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
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {/* Reply section */}
          {showReply ? (
            <ComposeEmail
              mode="reply"
              defaultTo={lastInboundMsg ? [lastInboundMsg.from_address] : []}
              onSend={handleReply}
              onCancel={() => setShowReply(false)}
            />
          ) : (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReply(true)}
                className="rounded-lg px-4 py-2 text-[12px] font-semibold flex items-center gap-2 transition-all"
                style={{
                  background: 'var(--gold, #AA8E67)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(170,142,103,0.3)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(170,142,103,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(170,142,103,0.3)'; }}
              >
                <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                Reply
              </button>
            </div>
          )}

          {/* Activity toggle */}
          {activity.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowActivity(!showActivity)}
                className="text-[10px] font-semibold uppercase tracking-wider transition-colors"
                style={{ color: 'var(--muted, #8C8C8C)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--charcoal, #3D3D3D)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted, #8C8C8C)'; }}
              >
                {showActivity ? 'Hide' : 'Show'} activity ({activity.length})
              </button>
              {showActivity && (
                <div
                  className="mt-2 rounded-lg p-3"
                  style={{ background: 'var(--elevated, #F8F6F3)' }}
                >
                  <EmailActivityLog activities={activity} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
