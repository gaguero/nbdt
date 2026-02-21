'use client';

import { use } from 'react';
import ThreadDetail from '@/components/staff/email/ThreadDetail';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function ThreadPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href={`/${locale}/staff/email`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Inbox
        </Link>
      </div>
      <ThreadDetail threadId={parseInt(id)} onUpdate={() => {}} />
    </div>
  );
}
