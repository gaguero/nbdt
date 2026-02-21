'use client';

import { EnvelopeIcon, InboxIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface EmailSidebarProps {
  accounts: Array<{ id: number; display_name: string; email_address: string }>;
  selectedAccountId: number | null;
  selectedStatus: string;
  onSelectAccount: (id: number | null) => void;
  onSelectStatus: (status: string) => void;
  unreadCount: number;
}

export default function EmailSidebar({
  accounts,
  selectedAccountId,
  selectedStatus,
  onSelectAccount,
  onSelectStatus,
  unreadCount,
}: EmailSidebarProps) {
  const statuses = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="space-y-4">
      {/* My Inbox */}
      <div>
        <button
          type="button"
          onClick={() => onSelectAccount(null)}
          className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-between ${
            selectedAccountId === null ? 'bg-sky-100 text-sky-800' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <InboxIcon className="h-4 w-4" />
            My Inbox
          </span>
          {unreadCount > 0 && (
            <span className="bg-sky-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Departments */}
      {accounts.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-3 mb-1">Departments</p>
          {accounts.map(account => (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelectAccount(account.id)}
              className={`w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors flex items-center gap-2 ${
                selectedAccountId === account.id ? 'bg-sky-100 text-sky-800 font-medium' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <EnvelopeIcon className="h-3.5 w-3.5" />
              {account.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Status Filter */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-3 mb-1 flex items-center gap-1">
          <FunnelIcon className="h-3 w-3" />
          Status
        </p>
        {statuses.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSelectStatus(s.value)}
            className={`w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors ${
              selectedStatus === s.value ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
