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

  const formatDateLong = (d: string) => {
    const date = parseDate(d);
    if (!date) return '';
    return date.toLocaleDateString(isEs ? 'es-CR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; labelEs: string }> = {
    pending: { bg: 'rgba(170,142,103,0.15)', text: '#AA8E67', label: 'Pending', labelEs: 'Pendiente' },
    confirmed: { bg: 'rgba(78,94,62,0.12)', text: '#4E5E3E', label: 'Confirmed', labelEs: 'Confirmado' },
    completed: { bg: 'rgba(78,94,62,0.08)', text: '#6B7F5A', label: 'Completed', labelEs: 'Completado' },
  };

  const QUICK_ACTIONS = [
    {
      href: `/${locale}/guest/tours`,
      label: isEs ? 'Explorar' : 'Explore',
      sub: isEs ? 'Tours y experiencias' : 'Tours & experiences',
      gradient: 'linear-gradient(135deg, #1a2e12 0%, #2d4a20 100%)',
      icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
    },
    {
      href: `/${locale}/guest/transfers`,
      label: isEs ? 'Traslados' : 'Transfers',
      sub: isEs ? 'Solicitar transporte' : 'Request transport',
      gradient: 'linear-gradient(135deg, #3a2a1a 0%, #5a3f28 100%)',
      icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    },
    {
      href: `/${locale}/guest/messages`,
      label: isEs ? 'Concierge' : 'Concierge',
      sub: isEs ? 'Chatea con nosotros' : 'Chat with us',
      gradient: 'linear-gradient(135deg, #1a2530 0%, #2a3b4a 100%)',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Hero welcome section */}
      <div className="relative px-5 pt-6 pb-5">
        {/* Greeting */}
        <div className="mb-1">
          <p className="text-xs tracking-widest uppercase mb-1.5" style={{ color: '#AA8E67', letterSpacing: '0.15em' }}>
            {isEs ? 'Bienvenido de vuelta' : 'Welcome back'}
          </p>
          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: '#1a2e12', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            {guest.first_name}
          </h1>
        </div>

        {/* Stay info card */}
        <div className="mt-4 rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0e1a09 0%, #1a2e12 60%, #243a1a 100%)' }}>
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #AA8E67 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-widest uppercase mb-2" style={{ color: 'rgba(170,142,103,0.7)', letterSpacing: '0.12em' }}>
                {isEs ? 'Su estadia' : 'Your stay'}
              </div>
              <div className="text-white text-sm font-medium">
                {formatDateLong(guest.arrival)}
              </div>
              <div className="text-white/40 text-xs mt-0.5">
                {isEs ? 'hasta' : 'to'} {formatDateLong(guest.departure)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-light" style={{ color: '#AA8E67' }}>
                {stayDays}
              </div>
              <div className="text-[10px] tracking-wider uppercase" style={{ color: 'rgba(170,142,103,0.6)', letterSpacing: '0.1em' }}>
                {isEs ? 'noches' : 'nights'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 mb-6">
        <div className="flex gap-2.5">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex-1 rounded-2xl p-4 relative overflow-hidden active:scale-[0.97]"
              style={{ background: action.gradient, transition: 'transform 0.15s', minHeight: '110px' }}
            >
              <div className="absolute top-3 right-3 opacity-20">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#fff">
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
              </div>
              <div className="relative flex flex-col justify-end h-full">
                <div className="text-white text-sm font-semibold">{action.label}</div>
                <div className="text-white/40 text-[10px] mt-0.5 leading-tight">{action.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming activities */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: '#1a2e12' }}>
            {isEs ? 'Proximas Actividades' : 'Upcoming'}
          </h2>
          <Link href={`/${locale}/guest/bookings`}
            className="text-[11px] font-medium"
            style={{ color: '#AA8E67' }}>
            {isEs ? 'Ver todo' : 'View all'}
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: '#B0B0A8' }}>
            {isEs ? 'Cargando...' : 'Loading...'}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-10 rounded-2xl"
            style={{ background: '#fff', border: '1px solid rgba(170,142,103,0.12)' }}>
            <svg className="h-10 w-10 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#AA8E67">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-sm" style={{ color: '#B0B0A8' }}>
              {isEs ? 'No hay actividades proximas' : 'No upcoming activities'}
            </p>
            <Link href={`/${locale}/guest/tours`}
              className="inline-block mt-3 text-xs font-semibold px-5 py-2 rounded-full"
              style={{ background: '#1a2e12', color: '#fff' }}>
              {isEs ? 'Explorar Tours' : 'Explore Tours'}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(item => {
              const st = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
              return (
                <div key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3.5 rounded-2xl p-4"
                  style={{ background: '#fff', border: '1px solid rgba(170,142,103,0.1)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.type === 'tour' ? 'rgba(78,94,62,0.08)' : 'rgba(170,142,103,0.08)' }}>
                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
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
                    <div className="text-[11px] mt-0.5" style={{ color: '#B0B0A8' }}>
                      {formatDate(item.date)} {item.time && `· ${item.time}`} · {item.details}
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: st.bg, color: st.text, letterSpacing: '0.05em' }}>
                    {isEs ? st.labelEs : st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="px-5 pb-8">
        <button onClick={logout}
          className="w-full text-center text-[11px] tracking-wider uppercase py-2.5 rounded-xl transition-colors"
          style={{ color: '#B0B0A8', letterSpacing: '0.08em' }}>
          {isEs ? 'Cerrar Sesion' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
