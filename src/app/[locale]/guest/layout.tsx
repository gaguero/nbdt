'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { GuestAuthProvider, useGuestAuth } from '@/contexts/GuestAuthContext';

const NAV_ITEMS = [
  { path: '/guest', label: 'Home', labelEs: 'Inicio', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25', exact: true },
  { path: '/guest/tours', label: 'Explore', labelEs: 'Explorar', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
  { path: '/guest/bookings', label: 'Bookings', labelEs: 'Reservas', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
  { path: '/guest/messages', label: 'Chat', labelEs: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
];

function GuestLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const { guest, loading } = useGuestAuth();
  const isEs = locale === 'es';

  const isLogin = pathname.includes('/guest/login');

  if (!loading && !guest && !isLogin) {
    if (typeof window !== 'undefined') {
      router.push(`/${locale}/guest/login`);
    }
    return null;
  }

  if (loading && !isLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #0e1a09 0%, #1a2e12 50%, #0e1a09 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/brand_assets/nayara-logo-round.png" alt="" width={56} height={56} className="animate-pulse" style={{ opacity: 0.5 }} />
          <div className="w-24 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(170,142,103,0.15)' }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: 'rgba(170,142,103,0.4)', width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F6F2' }}>
      {/* Luxurious top header */}
      {guest && (
        <header className="relative"
          style={{ background: 'linear-gradient(135deg, #0e1a09 0%, #1a2e12 60%, #243a1a 100%)' }}>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #AA8E67 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <img src="/brand_assets/nayara-logo-round.png" alt="" width={28} height={28} style={{ filter: 'brightness(1.1)' }} />
              <div>
                <div className="text-sm font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' }}>
                  {guest.first_name}
                </div>
                <div className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(170,142,103,0.7)', letterSpacing: '0.12em' }}>
                  {isEs ? 'Habitacion' : 'Room'} {guest.room}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/${locale === 'en' ? 'es' : 'en'}/guest`)}
              className="text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md transition-colors"
              style={{ color: 'rgba(170,142,103,0.7)', border: '1px solid rgba(170,142,103,0.2)', letterSpacing: '0.1em' }}
            >
              {locale === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
          {/* Gold accent line */}
          <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(170,142,103,0.3) 20%, rgba(170,142,103,0.3) 80%, transparent)' }} />
        </header>
      )}

      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom navigation - frosted glass effect */}
      <nav className="fixed bottom-0 inset-x-0 z-30"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(170,142,103,0.12)',
          boxShadow: '0 -4px 30px rgba(14,26,9,0.06)',
        }}>
        <div className="flex max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}${item.path}`;
            const active = item.exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={item.path}
                href={href}
                className="flex-1 flex flex-col items-center py-2.5 gap-1 relative"
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                    style={{ background: '#AA8E67' }} />
                )}
                <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24"
                  strokeWidth={active ? 2 : 1.3} stroke="currentColor"
                  style={{ color: active ? '#1a2e12' : '#B0B0A8' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium tracking-wide"
                  style={{ color: active ? '#1a2e12' : '#B0B0A8', letterSpacing: '0.03em' }}>
                  {isEs ? item.labelEs : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestAuthProvider>
      <GuestLayoutContent>{children}</GuestLayoutContent>
    </GuestAuthProvider>
  );
}
