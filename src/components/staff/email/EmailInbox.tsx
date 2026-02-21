'use client';

import { useState, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useEmailThreads, useEmailAccounts, useUnreadCount, useEmailActions } from '@/hooks/useEmail';
import EmailSidebar from './EmailSidebar';
import ThreadListItem from './ThreadListItem';
import ThreadDetail from './ThreadDetail';
import ComposeEmail from './ComposeEmail';

export default function EmailInbox() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);

  const { accounts, loading: accountsLoading } = useEmailAccounts();
  const { count: unreadCount, refetch: refetchUnread } = useUnreadCount();
  const { compose } = useEmailActions();

  const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } = useEmailThreads({
    accountId: selectedAccountId || undefined,
    status: selectedStatus || undefined,
    search: searchQuery || undefined,
    page,
  });

  const handleRefresh = useCallback(() => {
    refetchThreads();
    refetchUnread();
  }, [refetchThreads, refetchUnread]);

  const handleThreadSelect = (threadId: number) => {
    setSelectedThreadId(threadId);
    setShowCompose(false);
  };

  const handleComposeSend = async (data: {
    to: string[];
    cc?: string[];
    subject?: string;
    bodyText: string;
    bodyHtml: string;
    fromAlias?: string;
  }) => {
    if (!accounts.length) return;
    await compose({
      accountId: selectedAccountId || accounts[0].id,
      to: data.to,
      cc: data.cc,
      subject: data.subject || '(no subject)',
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      fromAlias: data.fromAlias,
    });
    setShowCompose(false);
    handleRefresh();
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <h1 className="text-lg font-bold text-slate-800">Email</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search emails..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm w-48 focus:w-64 transition-all focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setShowCompose(true); setSelectedThreadId(null); }}
            className="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700 flex items-center gap-1.5"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-slate-200 bg-slate-50 p-3 overflow-y-auto">
          <EmailSidebar
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            selectedStatus={selectedStatus}
            onSelectAccount={(id) => { setSelectedAccountId(id); setPage(1); setSelectedThreadId(null); }}
            onSelectStatus={(s) => { setSelectedStatus(s); setPage(1); }}
            unreadCount={unreadCount}
          />
        </div>

        {/* Thread list */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-4 text-sm text-slate-500">Loading...</div>
            ) : !threadsData?.threads.length ? (
              <div className="p-4 text-sm text-slate-400 text-center mt-8">No emails found</div>
            ) : (
              threadsData.threads.map(thread => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isActive={selectedThreadId === thread.id}
                  onClick={() => handleThreadSelect(thread.id)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {threadsData && threadsData.totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-white text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="hover:text-slate-700 disabled:opacity-30"
              >
                Prev
              </button>
              <span>Page {threadsData.page} of {threadsData.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(threadsData.totalPages, p + 1))}
                disabled={page >= threadsData.totalPages}
                className="hover:text-slate-700 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {showCompose ? (
            <div className="p-4 max-w-2xl mx-auto">
              <ComposeEmail
                mode="compose"
                onSend={handleComposeSend}
                onCancel={() => setShowCompose(false)}
              />
            </div>
          ) : selectedThreadId ? (
            <ThreadDetail
              threadId={selectedThreadId}
              onUpdate={handleRefresh}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Select a conversation to read
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
