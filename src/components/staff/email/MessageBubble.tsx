'use client';

import { PaperClipIcon } from '@heroicons/react/24/outline';

interface MessageProps {
  message: {
    id: number;
    from_address: string;
    from_name: string | null;
    to_addresses: Array<{ email: string; name?: string }>;
    cc_addresses: Array<{ email: string; name?: string }>;
    subject: string | null;
    body_text: string | null;
    body_html: string | null;
    gmail_internal_date: string;
    is_sent: boolean;
    direction: string;
    has_attachments: boolean;
    attachments: Array<{ id: number; filename: string; mime_type: string; size_bytes: number }> | null;
  };
}

export default function MessageBubble({ message }: MessageProps) {
  const isSent = message.direction === 'outbound';
  const date = new Date(message.gmail_internal_date);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`rounded-xl border p-4 ${isSent ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 bg-white'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {message.from_name || message.from_address}
            </p>
            {isSent && (
              <span className="text-[10px] bg-sky-200 text-sky-700 rounded px-1.5 py-0.5 font-medium">Sent</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            To: {message.to_addresses.map(a => a.name || a.email).join(', ')}
          </p>
          {message.cc_addresses.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              Cc: {message.cc_addresses.map(a => a.name || a.email).join(', ')}
            </p>
          )}
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">{formattedDate}</span>
      </div>

      {/* Body */}
      <div className="text-sm text-slate-700">
        {message.body_html ? (
          <iframe
            sandbox="allow-same-origin"
            srcDoc={sanitizeHtml(message.body_html)}
            className="w-full border-0 min-h-[100px]"
            onLoad={(e) => {
              const frame = e.currentTarget;
              if (frame.contentWindow?.document.body) {
                frame.style.height = frame.contentWindow.document.body.scrollHeight + 20 + 'px';
              }
            }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm">{message.body_text || ''}</pre>
        )}
      </div>

      {/* Attachments */}
      {message.has_attachments && message.attachments && message.attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
          {message.attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 text-sm">
              <PaperClipIcon className="h-3.5 w-3.5 text-slate-400" />
              <a
                href={`/api/email/attachments/${att.id}/download`}
                className="text-sky-600 hover:text-sky-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {att.filename}
              </a>
              <span className="text-xs text-slate-400">({formatSize(att.size_bytes)})</span>
              {att.mime_type.startsWith('image/') && (
                <a
                  href={`/api/email/attachments/${att.id}/preview`}
                  className="text-xs text-slate-500 hover:text-slate-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preview
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function sanitizeHtml(html: string): string {
  // Basic sanitization — strip script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
