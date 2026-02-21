'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ComposeEmail from '@/components/staff/email/ComposeEmail';
import { useEmailAccounts, useEmailActions } from '@/hooks/useEmail';

export default function ComposePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const { accounts } = useEmailAccounts();
  const { compose } = useEmailActions();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const accountId = selectedAccountId || accounts[0]?.id;

  const handleSend = async (data: {
    to: string[];
    cc?: string[];
    subject?: string;
    bodyText: string;
    bodyHtml: string;
    fromAlias?: string;
  }) => {
    if (!accountId) return;
    await compose({
      accountId,
      to: data.to,
      cc: data.cc,
      subject: data.subject || '(no subject)',
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      fromAlias: data.fromAlias,
    });
    router.push(`/${locale}/staff/email`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <Link
          href={`/${locale}/staff/email`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Inbox
        </Link>
        {accounts.length > 1 && (
          <select
            value={accountId || ''}
            onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>Send from: {a.display_name} ({a.email_address})</option>
            ))}
          </select>
        )}
      </div>
      <div className="max-w-2xl mx-auto p-4">
        <ComposeEmail
          mode="compose"
          onSend={handleSend}
          onCancel={() => router.push(`/${locale}/staff/email`)}
        />
      </div>
    </div>
  );
}
