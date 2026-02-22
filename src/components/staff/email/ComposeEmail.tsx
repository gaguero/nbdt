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
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'var(--surface, #fff)',
        border: '1px solid var(--separator, #E5E2DC)',
        boxShadow: '0 2px 12px rgba(78,94,62,0.06)',
      }}
    >
      {mode === 'compose' && (
        <div className="flex items-center justify-between">
          <h3
            className="text-[13px] font-bold"
            style={{ color: 'var(--charcoal, #3D3D3D)' }}
          >
            New Email
          </h3>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-md transition-colors"
              style={{ color: 'var(--muted, #8C8C8C)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label
            className="text-[11px] font-semibold w-8 text-right"
            style={{ color: 'var(--muted, #8C8C8C)' }}
          >
            To
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none transition-colors"
            style={{
              border: '1px solid var(--separator, #E5E2DC)',
              background: 'var(--elevated, #F8F6F3)',
              color: 'var(--charcoal, #3D3D3D)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold, #AA8E67)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--separator, #E5E2DC)'; }}
          />
          {!showCc && (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-[10px] font-semibold transition-colors"
              style={{ color: 'var(--muted-dim, #ACACAC)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--charcoal, #3D3D3D)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-dim, #ACACAC)'; }}
            >
              Cc
            </button>
          )}
        </div>

        {showCc && (
          <div className="flex items-center gap-2">
            <label
              className="text-[11px] font-semibold w-8 text-right"
              style={{ color: 'var(--muted, #8C8C8C)' }}
            >
              Cc
            </label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none transition-colors"
              style={{
                border: '1px solid var(--separator, #E5E2DC)',
                background: 'var(--elevated, #F8F6F3)',
                color: 'var(--charcoal, #3D3D3D)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold, #AA8E67)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--separator, #E5E2DC)'; }}
            />
          </div>
        )}

        {mode === 'compose' && (
          <div className="flex items-center gap-2">
            <label
              className="text-[11px] font-semibold w-8 text-right"
              style={{ color: 'var(--muted, #8C8C8C)' }}
            >
              Sub
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none transition-colors"
              style={{
                border: '1px solid var(--separator, #E5E2DC)',
                background: 'var(--elevated, #F8F6F3)',
                color: 'var(--charcoal, #3D3D3D)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold, #AA8E67)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--separator, #E5E2DC)'; }}
            />
          </div>
        )}

        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder={mode === 'reply' ? 'Write your reply...' : 'Write your message...'}
          rows={mode === 'reply' ? 4 : 8}
          className="w-full rounded-lg px-3 py-2 text-[13px] leading-relaxed outline-none resize-y transition-colors"
          style={{
            border: '1px solid var(--separator, #E5E2DC)',
            background: 'var(--elevated, #F8F6F3)',
            color: 'var(--charcoal, #3D3D3D)',
            fontFamily: 'var(--font-proxima-nova), system-ui, sans-serif',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold, #AA8E67)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--separator, #E5E2DC)'; }}
        />
      </div>

      {error && (
        <p className="text-[11px] font-medium" style={{ color: 'var(--terra, #EC6C4B)' }}>{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'reply' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                border: '1px solid var(--separator, #E5E2DC)',
                color: 'var(--muted, #8C8C8C)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Cancel
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !to.trim() || !bodyText.trim()}
          className="rounded-lg px-4 py-2 text-[12px] font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
          style={{
            background: 'var(--gold, #AA8E67)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(170,142,103,0.3)',
          }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(170,142,103,0.4)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(170,142,103,0.3)';
          }}
        >
          <PaperAirplaneIcon className="h-3.5 w-3.5" />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
