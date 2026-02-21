'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUturnLeftIcon,
  ChevronDownIcon,
  UserCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useEmailThread, useEmailActions } from '@/hooks/useEmail';
import MessageBubble from './MessageBubble';
import ComposeEmail from './ComposeEmail';
import EmailActivityLog from './EmailActivityLog';
import { StatusBadge, PriorityBadge } from './StatusBadge';

interface ThreadDetailProps {
  threadId: number;
  onUpdate: () => void;
}

export default function ThreadDetail({ threadId, onUpdate }: ThreadDetailProps) {
  const { data, loading, error, refetch } = useEmailThread(threadId);
  const { reply, updateThread, markRead } = useEmailActions();
  const [showReply, setShowReply] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

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
    return <div className="p-4 text-sm text-slate-500">Loading thread...</div>;
  }

  if (error || !data) {
    return <div className="p-4 text-sm text-rose-500">{error || 'Thread not found'}</div>;
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

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Thread header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-800">{thread.subject || '(no subject)'}</h2>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Status dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-1"
            >
              <StatusBadge status={thread.status} />
              <ChevronDownIcon className="h-3 w-3 text-slate-400" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                {['open', 'pending', 'closed'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 capitalize"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <PriorityBadge priority={thread.priority} />

          {thread.assigned_user_name && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <UserCircleIcon className="h-3.5 w-3.5" />
              {thread.assigned_user_name}
            </span>
          )}

          {thread.guest_name && (
            <span className="flex items-center gap-1 text-xs text-sky-600">
              <LinkIcon className="h-3.5 w-3.5" />
              {thread.guest_name}
            </span>
          )}

          <span className="text-xs text-slate-400">
            {thread.account_display_name} ({thread.account_email})
          </span>
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReply(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Reply
          </button>
        </div>
      )}

      {/* Activity log */}
      {activity.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <EmailActivityLog activities={activity} />
        </div>
      )}
    </div>
  );
}
