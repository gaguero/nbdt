'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

const NAV_ITEMS = [
  { path: '/guest/menu', label: 'Menu', icon: '🍽️' },
  { path: '/guest/tours', label: 'Tours', icon: '🌊' },
  { path: '/guest/orders', label: 'Orders', icon: '📋' },
  { path: '/guest/messages', label: 'Chat', icon: '💬' },
];

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = params?.locale as string;

  const isLanding = !NAV_ITEMS.some((item) => pathname.includes(item.path));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-16">
        {children}
      </main>
      {!isLanding && (
        <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
          <div className="flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname.includes(item.path);
              return (
                <Link
                  key={item.path}
                  href={`/${locale}${item.path}`}
                  className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                    active ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
