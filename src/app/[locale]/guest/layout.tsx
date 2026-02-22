'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { GuestAuthProvider, useGuestAuth } from '@/contexts/GuestAuthContext';

const NAV_ITEMS = [
  { path: '/guest', label: 'Home', labelEs: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', exact: true },
  { path: '/guest/tours', label: 'Tours', labelEs: 'Tours', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { path: '/guest/transfers', label: 'Transfers', labelEs: 'Traslados', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
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
          <img src="/brand_assets/nayara-logo-round.png" alt="" width={48} height={48} style={{ opacity: 0.3 }} />
          <p className="text-white/30 text-sm italic">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>
      {guest && (
        <header className="flex items-center justify-between px-4 py-2.5"
          style={{ background: '#0e1a09', borderBottom: '1px solid rgba(170,142,103,0.2)' }}>
          <div className="flex items-center gap-2.5">
            <img src="/brand_assets/nayara-logo-round.png" alt="" width={24} height={24} />
            <div>
              <span className="text-white/90 text-sm font-medium">{guest.first_name}</span>
              <span className="text-white/40 text-xs ml-2">
                {isEs ? 'Hab' : 'Room'} {guest.room}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/${locale === 'en' ? 'es' : 'en'}/guest`)}
            className="text-white/40 text-xs px-2 py-1 rounded border border-white/10 hover:border-white/20"
          >
            {locale === 'en' ? 'ES' : 'EN'}
          </button>
        </header>
      )}

      <main className="flex-1 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30"
        style={{ background: '#fff', borderTop: '1px solid #e5e2db', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}${item.path}`;
            const active = item.exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={item.path}
                href={href}
                className="flex-1 flex flex-col items-center py-2 gap-0.5"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  strokeWidth={active ? 2 : 1.5} stroke="currentColor"
                  style={{ color: active ? '#4E5E3E' : '#9CA3AF' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium"
                  style={{ color: active ? '#4E5E3E' : '#9CA3AF' }}>
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
