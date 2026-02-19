'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';

type NavItem = {
  key: string;
  label: string;
  href: string;
};

const ITEMS: NavItem[] = [
  { key: 'center', label: 'Center', href: '/staff/settings' },
  { key: 'guests', label: 'Guest Import', href: '/staff/import-wizard' },
  { key: 'vendors', label: 'Vendor Import', href: '/staff/vendor-import-wizard' },
  { key: 'transfers', label: 'Transfer Import', href: '/staff/transfer-wizard' },
  { key: 'tours', label: 'Tour Import', href: '/staff/tour-normalization' },
  { key: 'guest_norm', label: 'Guest Normalization', href: '/staff/guest-normalization' },
  { key: 'vendor_norm', label: 'Vendor Normalization', href: '/staff/vendor-normalization' },
  { key: 'config', label: 'Configuration', href: '/staff/data-curation-settings' },
];

export function DataCurationNav() {
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? 'en';

  const localItems = useMemo(
    () => ITEMS.map((item) => ({ ...item, href: `/${locale}${item.href}` })),
    [locale]
  );

  const currentIndex = localItems.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const prevItem = currentIndex > 0 ? localItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < localItems.length - 1 ? localItems[currentIndex + 1] : null;

  return (
    <div className="sticky top-2 z-20 space-y-2">
      <div className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          {localItems.map((item, idx) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center ${active ? 'bg-blue-500' : 'bg-white text-gray-500'}`}>
                  {idx + 1}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {(prevItem || nextItem) && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <div>
            {prevItem ? <Link className="hover:text-gray-700" href={prevItem.href}>← {prevItem.label}</Link> : <span />}
          </div>
          <div>
            {nextItem ? <Link className="hover:text-gray-700" href={nextItem.href}>{nextItem.label} →</Link> : <span />}
          </div>
        </div>
      )}
    </div>
  );
}

