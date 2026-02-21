'use client';

import { useState } from 'react';
import { PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ComposeEmailProps {
  mode: 'compose' | 'reply';
  defaultTo?: string[];
  defaultSubject?: string;
  defaultFromAlias?: string;
  threadId?: number;
  messageId?: number;
  onSend: (data: {
    to: string[];
    cc?: string[];
    subject?: string;
    bodyText: string;
    bodyHtml: string;
    fromAlias?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export default function ComposeEmail({
  mode,
  defaultTo = [],
  defaultSubject = '',
  defaultFromAlias,
  onSend,
  onCancel,
}: ComposeEmailProps) {
  const [to, setTo] = useState(defaultTo.join(', '));
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [bodyText, setBodyText] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!to.trim() || !bodyText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const toList = to.split(',').map(e => e.trim()).filter(Boolean);
      const ccList = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined;
      await onSend({
        to: toList,
        cc: ccList,
        subject: mode === 'compose' ? subject : undefined,
        bodyText,
        bodyHtml: `<div style="font-family:sans-serif;font-size:14px">${bodyText.replace(/\n/g, '<br>')}</div>`,
        fromAlias: defaultFromAlias,
      });
      setBodyText('');
      setTo('');
      setCc('');
      setSubject('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {mode === 'compose' && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">New Email</h3>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 w-8">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
          />
          {!showCc && (
            <button type="button" onClick={() => setShowCc(true)} className="text-xs text-slate-400 hover:text-slate-600">Cc</button>
          )}
        </div>

        {showCc && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 w-8">Cc</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
            />
          </div>
        )}

        {mode === 'compose' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 w-8">Sub</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
            />
          </div>
        )}

        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder={mode === 'reply' ? 'Write your reply...' : 'Write your message...'}
          rows={mode === 'reply' ? 4 : 8}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none resize-y"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'reply' && onCancel && (
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !to.trim() || !bodyText.trim()}
          className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
