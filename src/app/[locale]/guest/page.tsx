'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

interface UpcomingItem {
  type: 'tour' | 'transfer';
  id: string;
  title: string;
  date: string;
  time: string;
  status: string;
  details: string;
}

export default function GuestHomePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { guest, logout } = useGuestAuth();
  const isEs = locale === 'es';

  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guest) return;
    loadUpcoming();
  }, [guest]);

  async function loadUpcoming() {
    setLoading(true);
    try {
      const [toursRes, transfersRes] = await Promise.all([
        fetch('/api/guest/tour-bookings', { credentials: 'include' }),
        fetch('/api/guest/transfers', { credentials: 'include' }),
      ]);

      const items: UpcomingItem[] = [];

      if (toursRes.ok) {
        const data = await toursRes.json();
        (data.bookings || [])
          .filter((b: any) => b.guest_status !== 'cancelled')
          .forEach((b: any) => {
            items.push({
              type: 'tour',
              id: b.id,
              title: isEs ? (b.name_es || b.name_en) : (b.name_en || b.name_es),
              date: b.schedule_date || '',
              time: b.start_time?.slice(0, 5) || '',
              status: b.guest_status,
              details: `${b.num_guests} ${isEs ? 'personas' : 'guests'}`,
            });
          });
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        (data.transfers || [])
          .filter((t: any) => t.guest_status !== 'cancelled')
          .forEach((t: any) => {
            items.push({
              type: 'transfer',
              id: t.id,
              title: `${t.origin || '?'} → ${t.destination || '?'}`,
              date: t.date || '',
              time: t.time?.slice(0, 5) || '',
              status: t.guest_status,
              details: `${t.num_passengers} ${isEs ? 'pasajeros' : 'passengers'}`,
            });
          });
      }

      items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      setUpcoming(items.slice(0, 6));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!guest) return null;

  const parseDate = (d: string) => {
    if (!d) return null;
    // Handle both date-only (2024-03-15) and full ISO (2024-03-15T00:00:00.000Z) formats
    const dateStr = d.includes('T') ? d.split('T')[0] : d;
    const date = new Date(dateStr + 'T12:00:00');
    return isNaN(date.getTime()) ? null : date;
  };

  const arrivalDate = guest.arrival ? parseDate(guest.arrival) : null;
  const departureDate = guest.departure ? parseDate(guest.departure) : null;
  const stayDays = arrivalDate && departureDate
    ? Math.ceil((departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const formatDate = (d: string) => {
    const date = parseDate(d);
    if (!date) return '';
    return date.toLocaleDateString(isEs ? 'es-CR' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'rgba(217,170,60,0.12)', text: '#B8941E' },
    confirmed: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E' },
    completed: { bg: 'rgba(78,94,62,0.08)', text: '#6B7F5A' },
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#1a2e12', fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic' }}>
          {isEs ? 'Bienvenido' : 'Welcome'}, {guest.first_name}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B7F5A' }}>
          {isEs ? 'Hab' : 'Room'} {guest.room} &middot; {formatDate(guest.arrival)} – {formatDate(guest.departure)}
          {stayDays > 0 && ` (${stayDays} ${isEs ? 'noches' : 'nights'})`}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: `/${locale}/guest/tours`, label: isEs ? 'Tours y Actividades' : 'Tours & Activities', iconColor: '#4E5E3E', bgColor: 'rgba(78,94,62,0.1)', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
          { href: `/${locale}/guest/transfers`, label: isEs ? 'Mis Traslados' : 'My Transfers', iconColor: '#AA8E67', bgColor: 'rgba(170,142,103,0.1)', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
          { href: `/${locale}/guest/bookings`, label: isEs ? 'Mis Reservas' : 'My Bookings', iconColor: '#4E5E3E', bgColor: 'rgba(78,94,62,0.1)', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
          { href: `/${locale}/guest/messages`, label: isEs ? 'Mensajes' : 'Messages', iconColor: '#AA8E67', bgColor: 'rgba(170,142,103,0.1)', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-2 rounded-2xl p-5 active:scale-[0.98]"
            style={{ background: '#fff', border: '1px solid #e5e2db', boxShadow: '0 2px 8px rgba(78,94,62,0.06)', transition: 'transform 0.1s' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: a.bgColor }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={a.iconColor}>
                <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
              </svg>
            </div>
            <span className="text-sm font-medium text-center" style={{ color: '#1a2e12' }}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Upcoming activities */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: '#1a2e12' }}>
          {isEs ? 'Próximas Actividades' : 'Upcoming Activities'}
        </h2>

        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>
            {isEs ? 'Cargando...' : 'Loading...'}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8 rounded-2xl" style={{ background: '#fff', border: '1px solid #e5e2db' }}>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {isEs ? 'No hay actividades próximas' : 'No upcoming activities'}
            </p>
            <Link href={`/${locale}/guest/tours`}
              className="inline-block mt-3 text-sm font-medium px-4 py-2 rounded-xl"
              style={{ background: 'rgba(78,94,62,0.1)', color: '#4E5E3E' }}>
              {isEs ? 'Explorar Tours' : 'Explore Tours'}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(item => {
              const st = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
              return (
                <div key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 rounded-xl p-3.5"
                  style={{ background: '#fff', border: '1px solid #e5e2db' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: item.type === 'tour' ? 'rgba(78,94,62,0.1)' : 'rgba(170,142,103,0.1)' }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                      stroke={item.type === 'tour' ? '#4E5E3E' : '#AA8E67'}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d={item.type === 'tour'
                          ? 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
                          : 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
                        } />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#1a2e12' }}>{item.title}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      {formatDate(item.date)} {item.time && `· ${item.time}`} · {item.details}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                    style={{ background: st.bg, color: st.text }}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="pt-4">
        <button onClick={logout}
          className="w-full text-center text-xs py-2 rounded-xl"
          style={{ color: '#9CA3AF', border: '1px solid #e5e2db' }}>
          {isEs ? 'Cerrar Sesión' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
