'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

type NavItem = {
  key: string;
  label: string;
  href: string;
  detail: string;
};

const ITEMS: NavItem[] = [
  { key: 'center', label: 'Center', href: '/staff/settings', detail: 'Overview and orchestration' },
  { key: 'guests', label: 'Guest Import', href: '/staff/import-wizard', detail: 'Create complete guest profiles' },
  { key: 'vendors', label: 'Vendor Import', href: '/staff/vendor-import-wizard', detail: 'Sync vendors with legacy IDs' },
  { key: 'appsheet', label: 'AppSheet Import', href: '/staff/appsheet-import', detail: 'Direct legacy table ingestion' },
  { key: 'transfers', label: 'Transfer Import', href: '/staff/transfer-wizard', detail: 'Import and resolve transfer rows' },
  { key: 'tours', label: 'Tour Import', href: '/staff/tour-normalization', detail: 'Normalize activities and vendors' },
  { key: 'guest_norm', label: 'Guest Normalization', href: '/staff/guest-normalization', detail: 'Merge duplicates and relink' },
  { key: 'vendor_norm', label: 'Vendor Normalization', href: '/staff/vendor-normalization', detail: 'Merge vendor duplicates safely' },
  { key: 'config', label: 'Configuration', href: '/staff/data-curation-settings', detail: 'Global curation behavior' },
];

export function DataCurationNav() {
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const locale = params?.locale ?? 'en';

  const localItems = useMemo(
    () => ITEMS.map((item) => ({ ...item, href: `/${locale}${item.href}` })),
    [locale]
  );

  const currentIndex = localItems.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const prevItem = currentIndex > 0 ? localItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < localItems.length - 1 ? localItems[currentIndex + 1] : null;
  const activeItem = currentIndex >= 0 ? localItems[currentIndex] : localItems[0];

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold">Data Curation Center</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{activeItem.label}</p>
            <span className="text-xs rounded-full bg-white px-2 py-0.5 border border-amber-200 text-amber-700">
              Step {Math.max(1, currentIndex + 1)} of {localItems.length}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{activeItem.detail}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-amber-50"
        >
          {expanded ? 'Hide Flow' : 'Show Flow'}
          {expanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-100">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {localItems.map((item, idx) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center ${
                    active ? 'bg-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-gray-600">
        {prevItem ? (
          <Link className="hover:text-gray-900" href={prevItem.href}>← {prevItem.label}</Link>
        ) : (
          <span />
        )}
        {nextItem ? (
          <Link className="hover:text-gray-900" href={nextItem.href}>{nextItem.label} →</Link>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}
