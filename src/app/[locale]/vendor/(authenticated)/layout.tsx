'use client';

import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function VendorAuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/vendor/login`);
  }

  const navItems = [
    { href: `/${locale}/vendor/dashboard`, label: 'Dashboard' },
    { href: `/${locale}/vendor/bookings`, label: 'My Bookings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Nayara Vendor Portal</span>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Sign Out
        </button>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
