'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  XMarkIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  HomeIcon,
  TruckIcon,
  MapIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { ContactContext } from '@/hooks/useEmail';

interface ContactContextPanelProps {
  context: ContactContext | null;
  loading: boolean;
  onClose: () => void;
  onThreadClick?: (threadId: number) => void;
}

const CONTACT_TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  guest: { bg: 'rgba(78,94,62,0.12)', color: '#4E5E3E', label: 'Guest' },
  vendor: { bg: 'rgba(170,142,103,0.12)', color: '#AA8E67', label: 'Vendor' },
  staff: { bg: 'rgba(37,99,235,0.12)', color: '#2563EB', label: 'Staff' },
  external: { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'External' },
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#2563EB',
  checked_in: '#059669',
  in_house: '#059669',
  due_in: '#D97706',
  due_out: '#EA580C',
  checked_out: '#6B7280',
  cancelled: '#DC2626',
  no_show: '#6B7280',
  pending: '#D97706',
  completed: '#059669',
  open: '#059669',
  closed: '#6B7280',
};

export default function ContactContextPanel({ context, loading, onClose, onThreadClick }: ContactContextPanelProps) {
  const locale = useLocale();

  if (loading) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--surface, #fff)' }}>
        <PanelHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold, #AA8E67)', borderTopColor: 'transparent' }}
            />
            <p className="text-[11px]" style={{ color: 'var(--muted, #8C8C8C)' }}>Loading context...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--surface, #fff)' }}>
        <PanelHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <UserCircleIcon className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--muted-dim, #ACACAC)' }} />
            <p className="text-[12px]" style={{ color: 'var(--muted, #8C8C8C)' }}>
              Select a conversation to see contact intelligence
            </p>
          </div>
        </div>
      </div>
    );
  }

  const typeStyle = CONTACT_TYPE_STYLES[context.contact.type] || CONTACT_TYPE_STYLES.external;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface, #fff)' }}>
      <PanelHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {/* Contact Card */}
        <div className="p-4 pb-3" style={{ borderBottom: '1px solid var(--separator, #E5E2DC)' }}>
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
              style={{
                background: typeStyle.bg,
                color: typeStyle.color,
              }}
            >
              {getInitials(context.contact.name || context.contact.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[14px] font-bold truncate"
                style={{ color: 'var(--charcoal, #3D3D3D)', letterSpacing: '-0.01em' }}
              >
                {context.contact.name || context.contact.email.split('@')[0]}
              </p>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-0.5"
                style={{ background: typeStyle.bg, color: typeStyle.color }}
              >
                {typeStyle.label}
              </span>
            </div>
          </div>

          {/* Contact details */}
          <div className="mt-3 space-y-1.5">
            <ContactRow icon={EnvelopeIcon} value={context.contact.email} href={`mailto:${context.contact.email}`} />
            {context.guest?.phone && (
              <ContactRow icon={PhoneIcon} value={context.guest.phone} href={`tel:${context.guest.phone}`} />
            )}
            {context.guest?.nationality && (
              <ContactRow icon={GlobeAltIcon} value={context.guest.nationality} />
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <StatBadge label="Emails" value={context.stats.totalEmails} />
            <StatBadge label="Stays" value={context.stats.totalStays} />
            <StatBadge label="Tours" value={context.stats.totalTours} />
            <StatBadge label="Transfers" value={context.stats.totalTransfers} />
          </div>
        </div>

        {/* Guest Profile Link */}
        {context.guest && (
          <ContextSection title="Guest Profile" icon={UserCircleIcon}>
            <Link
              href={`/${locale}/staff/guests?id=${context.guest.id}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors"
              style={{ background: 'var(--elevated, #F8F6F3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(170,142,103,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
            >
              <div>
                <p className="text-[12px] font-semibold" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                  {context.guest.full_name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--muted, #8C8C8C)' }}>
                  {context.guest.email || 'No email'}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4" style={{ color: 'var(--muted-dim, #ACACAC)' }} />
            </Link>
            {context.guest.notes && (
              <p
                className="mt-2 text-[11px] italic px-1 leading-relaxed"
                style={{ color: 'var(--muted, #8C8C8C)' }}
              >
                &ldquo;{context.guest.notes}&rdquo;
              </p>
            )}
          </ContextSection>
        )}

        {/* Active Reservation */}
        {context.reservation && (
          <ContextSection title="Current Reservation" icon={CalendarDaysIcon}>
            <Link
              href={`/${locale}/staff/reservations?id=${context.reservation.id}`}
              className="block rounded-lg px-3 py-2 transition-colors"
              style={{ background: 'var(--elevated, #F8F6F3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(170,142,103,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HomeIcon className="h-3.5 w-3.5" style={{ color: 'var(--gold, #AA8E67)' }} />
                  <span className="text-[12px] font-bold" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                    Room {context.reservation.room || '—'}
                  </span>
                </div>
                <StatusPill status={context.reservation.status} />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: 'var(--muted, #8C8C8C)' }}>
                <span>{formatDate(context.reservation.arrival)} &rarr; {formatDate(context.reservation.departure)}</span>
                {context.reservation.nights && <span>{context.reservation.nights}N</span>}
                {context.reservation.persons && <span>{context.reservation.persons}P</span>}
              </div>
              {context.reservation.room_category && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                  {context.reservation.room_category}
                  {context.reservation.rate_code && ` / ${context.reservation.rate_code}`}
                </p>
              )}
            </Link>
          </ContextSection>
        )}

        {/* Past Reservations */}
        {context.pastReservations.length > 1 && (
          <ContextSection title={`Stay History (${context.pastReservations.length})`} icon={ClockIcon}>
            <div className="space-y-1">
              {context.pastReservations.slice(0, 3).map(r => (
                <Link
                  key={r.id}
                  href={`/${locale}/staff/reservations?id=${r.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: 'var(--muted, #8C8C8C)' }}>
                    {formatDate(r.arrival)} — Room {r.room || '—'}
                  </span>
                  <StatusPill status={r.status} small />
                </Link>
              ))}
            </div>
          </ContextSection>
        )}

        {/* Transfers */}
        {context.transfers.length > 0 && (
          <ContextSection title={`Transfers (${context.transfers.length})`} icon={TruckIcon}>
            <div className="space-y-1.5">
              {context.transfers.slice(0, 3).map(t => (
                <Link
                  key={t.id}
                  href={`/${locale}/staff/transfers?id=${t.id}`}
                  className="block rounded-md px-2 py-1.5 transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                      {t.origin} &rarr; {t.destination}
                    </span>
                    <StatusPill status={t.status} small />
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                    {formatDate(t.transfer_date)} {t.time?.slice(0, 5)} &middot; {t.pax} pax
                    {t.vendor_name && ` &middot; ${t.vendor_name}`}
                  </p>
                </Link>
              ))}
            </div>
          </ContextSection>
        )}

        {/* Tours */}
        {context.tours.length > 0 && (
          <ContextSection title={`Tours (${context.tours.length})`} icon={MapIcon}>
            <div className="space-y-1.5">
              {context.tours.slice(0, 3).map(t => (
                <Link
                  key={t.id}
                  href={`/${locale}/staff/tour-bookings?id=${t.id}`}
                  className="block rounded-md px-2 py-1.5 transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium truncate" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                      {t.activity_name}
                    </span>
                    <StatusPill status={t.status} small />
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                    {formatDate(t.tour_date)} {t.start_time?.slice(0, 5) || ''} &middot; {t.num_guests} guests
                  </p>
                </Link>
              ))}
            </div>
          </ContextSection>
        )}

        {/* Special Requests */}
        {context.specialRequests.length > 0 && (
          <ContextSection title={`Requests (${context.specialRequests.length})`} icon={SparklesIcon}>
            <div className="space-y-1.5">
              {context.specialRequests.slice(0, 3).map(r => (
                <Link
                  key={r.id}
                  href={`/${locale}/staff/special-requests?id=${r.id}`}
                  className="block rounded-md px-2 py-1.5 transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium truncate" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                      {r.request}
                    </span>
                    <StatusPill status={r.status} small />
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                    {r.department || 'General'} &middot; {formatDate(r.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          </ContextSection>
        )}

        {/* Email History */}
        {context.emailHistory.length > 0 && (
          <ContextSection title={`Email History (${context.emailHistory.length})`} icon={ChatBubbleLeftRightIcon}>
            <div className="space-y-1">
              {context.emailHistory.slice(0, 5).map(e => (
                <button
                  key={e.thread_id}
                  type="button"
                  onClick={() => onThreadClick?.(e.thread_id)}
                  className="w-full text-left block rounded-md px-2 py-1.5 transition-colors"
                  onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}
                >
                  <p className="text-[11px] font-medium truncate" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                    {e.subject || '(no subject)'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                      {e.last_message_at ? formatDate(e.last_message_at) : '—'} &middot; {e.message_count} msgs
                    </span>
                    <StatusPill status={e.status} small />
                  </div>
                </button>
              ))}
            </div>
          </ContextSection>
        )}

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Sub-components ──

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 flex-shrink-0"
      style={{
        height: 48,
        borderBottom: '1px solid var(--separator, #E5E2DC)',
      }}
    >
      <h3
        className="text-[13px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--charcoal, #3D3D3D)' }}
      >
        Context
      </h3>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-md transition-colors"
        style={{ color: 'var(--muted, #8C8C8C)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function ContextSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--separator, #E5E2DC)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--gold, #AA8E67)' }} />
        <h4
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--muted, #8C8C8C)' }}
        >
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function ContactRow({ icon: Icon, value, href }: { icon: React.ElementType; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--muted, #8C8C8C)' }} />
      <span className="text-[11px] truncate" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block rounded-md px-1 py-0.5 transition-colors"
        style={{ textDecoration: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {content}
      </a>
    );
  }

  return <div className="px-1 py-0.5">{content}</div>;
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-lg py-1.5 text-center"
      style={{ background: 'var(--elevated, #F8F6F3)' }}
    >
      <p
        className="text-[14px] font-bold tabular-nums"
        style={{ color: 'var(--charcoal, #3D3D3D)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      <p className="text-[8px] uppercase tracking-wider font-semibold" style={{ color: 'var(--muted, #8C8C8C)' }}>
        {label}
      </p>
    </div>
  );
}

function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const normalized = status?.toLowerCase().replace(/[_\s]/g, '_') || 'unknown';
  const color = STATUS_COLORS[normalized] || '#6B7280';

  return (
    <span
      className="inline-flex items-center rounded-full font-semibold capitalize flex-shrink-0"
      style={{
        fontSize: small ? 8 : 9,
        padding: small ? '1px 5px' : '2px 6px',
        background: `${color}14`,
        color,
        border: `1px solid ${color}25`,
      }}
    >
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
