'use client';

import { PaperClipIcon, DocumentIcon, PhotoIcon, FilmIcon } from '@heroicons/react/24/outline';

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

  const senderName = message.from_name || message.from_address;
  const initials = getInitials(senderName);
  const avatarColor = getAvatarColor(message.from_address);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: isSent ? 'rgba(170,142,103,0.06)' : 'var(--surface, #fff)',
        border: `1px solid ${isSent ? 'rgba(170,142,103,0.15)' : 'var(--separator, #E5E2DC)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            background: isSent ? 'var(--gold, #AA8E67)' : avatarColor,
            color: '#fff',
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
              {senderName}
            </p>
            {isSent && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                style={{ background: 'rgba(170,142,103,0.12)', color: 'var(--gold, #AA8E67)' }}
              >
                Sent
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted, #8C8C8C)' }}>
            To: {message.to_addresses.map(a => a.name || a.email).join(', ')}
          </p>
          {message.cc_addresses.length > 0 && (
            <p className="text-[10px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
              Cc: {message.cc_addresses.map(a => a.name || a.email).join(', ')}
            </p>
          )}
        </div>
        <span
          className="text-[10px] flex-shrink-0 tabular-nums"
          style={{ color: 'var(--muted-dim, #ACACAC)' }}
        >
          {formattedDate}
        </span>
      </div>

      {/* Body */}
      <div className="text-[13px] leading-relaxed" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
        {message.body_html ? (
          <iframe
            sandbox="allow-same-origin"
            srcDoc={sanitizeHtml(message.body_html)}
            className="w-full border-0 min-h-[60px] rounded-lg"
            style={{ background: 'transparent' }}
            onLoad={(e) => {
              const frame = e.currentTarget;
              if (frame.contentWindow?.document.body) {
                frame.style.height = frame.contentWindow.document.body.scrollHeight + 20 + 'px';
              }
            }}
          />
        ) : (
          <pre
            className="whitespace-pre-wrap text-[13px] leading-relaxed"
            style={{ fontFamily: 'var(--font-proxima-nova), system-ui, sans-serif' }}
          >
            {message.body_text || ''}
          </pre>
        )}
      </div>

      {/* Attachments */}
      {message.has_attachments && message.attachments && message.attachments.length > 0 && (
        <div
          className="mt-3 pt-3 space-y-1.5"
          style={{ borderTop: '1px solid var(--separator, #E5E2DC)' }}
        >
          <p
            className="text-[9px] uppercase tracking-wider font-bold mb-1"
            style={{ color: 'var(--muted, #8C8C8C)' }}
          >
            {message.attachments.length} Attachment{message.attachments.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map(att => (
              <a
                key={att.id}
                href={`/api/email/attachments/${att.id}/download`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
                style={{
                  background: 'var(--elevated, #F8F6F3)',
                  border: '1px solid var(--separator, #E5E2DC)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(170,142,103,0.08)'; e.currentTarget.style.borderColor = 'rgba(170,142,103,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; e.currentTarget.style.borderColor = 'var(--separator, #E5E2DC)'; }}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileTypeIcon mimeType={att.mime_type} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate max-w-[140px]" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                    {att.filename}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                    {formatSize(att.size_bytes)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const style = { color: 'var(--muted, #8C8C8C)' };
  if (mimeType.startsWith('image/')) return <PhotoIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />;
  if (mimeType.startsWith('video/')) return <FilmIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#7C3AED' }} />;
  if (mimeType === 'application/pdf') return <DocumentIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#DC2626' }} />;
  return <PaperClipIcon className="h-4 w-4 flex-shrink-0" style={style} />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
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
