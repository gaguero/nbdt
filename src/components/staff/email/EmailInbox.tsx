'use client';

import { useState, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  useEmailThreads,
  useEmailAccounts,
  useUnreadCount,
  useEmailActions,
  useEmailLabels,
  useEmailContext,
  type ThreadFilters,
} from '@/hooks/useEmail';
import EmailSidebar from './EmailSidebar';
import ThreadListItem from './ThreadListItem';
import ThreadDetail from './ThreadDetail';
import ComposeEmail from './ComposeEmail';
import ContactContextPanel from './ContactContextPanel';

type FolderKey = 'inbox' | 'starred' | 'sent' | 'archive' | 'trash';

export default function EmailInbox() {
  // ── State ──
  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox');
  const [activeLabelId, setActiveLabelId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);
  const [showContext, setShowContext] = useState(true);

  // ── Data ──
  const { accounts, loading: accountsLoading } = useEmailAccounts();
  const { count: unreadCount, refetch: refetchUnread } = useUnreadCount();
  const { labels, refetch: refetchLabels } = useEmailLabels();
  const { compose, toggleStar } = useEmailActions();

  // Build filters based on active folder
  const filters: ThreadFilters = {
    accountId: selectedAccountId || undefined,
    search: searchQuery || undefined,
    page,
    ...(activeLabelId ? { labelId: activeLabelId } : {}),
    ...(activeFolder === 'inbox' ? {} : {}),
    ...(activeFolder === 'starred' ? { starred: true } : {}),
    ...(activeFolder === 'sent' ? { folder: 'sent' } : {}),
    ...(activeFolder === 'archive' ? { archived: true } : {}),
    ...(activeFolder === 'trash' ? { folder: 'trash' } : {}),
  };

  const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } = useEmailThreads(filters);

  // Context panel data for selected thread
  const { data: contextData, loading: contextLoading } = useEmailContext(
    showContext && selectedThreadId ? selectedThreadId : null
  );

  // ── Handlers ──
  const handleRefresh = useCallback(() => {
    refetchThreads();
    refetchUnread();
  }, [refetchThreads, refetchUnread]);

  const handleFolderSelect = (folder: FolderKey) => {
    setActiveFolder(folder);
    setActiveLabelId(null);
    setSelectedThreadId(null);
    setShowCompose(false);
    setPage(1);
  };

  const handleLabelSelect = (labelId: number) => {
    setActiveLabelId(labelId);
    setActiveFolder('inbox'); // reset folder when filtering by label
    setSelectedThreadId(null);
    setShowCompose(false);
    setPage(1);
  };

  const handleThreadSelect = (threadId: number) => {
    setSelectedThreadId(threadId);
    setShowCompose(false);
  };

  const handleToggleStar = async (threadId: number, currentStarred: boolean) => {
    await toggleStar(threadId, !currentStarred);
    refetchThreads();
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

  const handleCreateLabel = async (name: string, color: string) => {
    try {
      await fetch('/api/email/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      refetchLabels();
    } catch { /* silent */ }
  };

  // ── Layout ──
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col" style={{ background: 'var(--bg, #F5F3EF)' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: 52,
          background: 'var(--surface, #fff)',
          borderBottom: '1px solid var(--separator, #E5E2DC)',
        }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-[15px] font-bold"
            style={{
              fontFamily: 'var(--font-gelasio), Georgia, serif',
              fontStyle: 'italic',
              color: 'var(--charcoal, #3D3D3D)',
              letterSpacing: '-0.01em',
            }}
          >
            Email
          </h1>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
              style={{ background: 'var(--terra, #EC6C4B)', color: '#fff' }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: 'var(--muted-dim, #ACACAC)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search emails..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-[12px] w-44 focus:w-56 outline-none transition-all"
              style={{
                border: '1px solid var(--separator, #E5E2DC)',
                background: 'var(--elevated, #F8F6F3)',
                color: 'var(--charcoal, #3D3D3D)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold, #AA8E67)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(170,142,103,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--separator, #E5E2DC)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--separator, #E5E2DC)',
              color: 'var(--muted, #8C8C8C)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--elevated, #F8F6F3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>

          {/* Context toggle */}
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--separator, #E5E2DC)',
              color: showContext ? 'var(--gold, #AA8E67)' : 'var(--muted, #8C8C8C)',
              background: showContext ? 'rgba(170,142,103,0.08)' : 'transparent',
            }}
            onMouseEnter={e => {
              if (!showContext) e.currentTarget.style.background = 'var(--elevated, #F8F6F3)';
            }}
            onMouseLeave={e => {
              if (!showContext) e.currentTarget.style.background = 'transparent';
            }}
            title="Toggle context panel"
          >
            <InformationCircleIcon className="h-4 w-4" />
          </button>

          {/* Compose */}
          <button
            type="button"
            onClick={() => { setShowCompose(true); setSelectedThreadId(null); }}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold flex items-center gap-1.5 transition-all"
            style={{
              background: 'var(--gold, #AA8E67)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(170,142,103,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(170,142,103,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(170,142,103,0.3)'; }}
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
            Compose
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className="w-52 flex-shrink-0 overflow-y-auto py-3 px-2"
          style={{
            background: 'var(--surface, #fff)',
            borderRight: '1px solid var(--separator, #E5E2DC)',
          }}
        >
          <EmailSidebar
            activeFolder={activeFolder}
            activeLabelId={activeLabelId}
            onSelectFolder={handleFolderSelect}
            onSelectLabel={handleLabelSelect}
            unreadCount={unreadCount}
            folderCounts={{}}
            labels={labels}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={(id) => { setSelectedAccountId(id); setPage(1); setSelectedThreadId(null); }}
            onCreateLabel={handleCreateLabel}
          />
        </div>

        {/* Thread list */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            width: 340,
            background: 'var(--surface, #fff)',
            borderRight: '1px solid var(--separator, #E5E2DC)',
          }}
        >
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--gold, #AA8E67)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : !threadsData?.threads.length ? (
              <div className="flex flex-col items-center justify-center h-48 px-6">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ background: 'var(--elevated, #F8F6F3)' }}
                >
                  <MagnifyingGlassIcon className="h-5 w-5" style={{ color: 'var(--muted-dim, #ACACAC)' }} />
                </div>
                <p className="text-[12px] text-center" style={{ color: 'var(--muted, #8C8C8C)' }}>
                  {searchQuery ? 'No emails match your search' : 'No emails in this folder'}
                </p>
              </div>
            ) : (
              threadsData.threads.map(thread => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isActive={selectedThreadId === thread.id}
                  onClick={() => handleThreadSelect(thread.id)}
                  onToggleStar={() => handleToggleStar(thread.id, thread.is_starred)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {threadsData && threadsData.totalPages > 1 && (
            <div
              className="flex items-center justify-between px-3 py-2 flex-shrink-0"
              style={{
                borderTop: '1px solid var(--separator, #E5E2DC)',
                background: 'var(--surface, #fff)',
              }}
            >
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-[11px] font-medium transition-colors disabled:opacity-30"
                style={{ color: 'var(--muted, #8C8C8C)' }}
              >
                Prev
              </button>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                {threadsData.page} / {threadsData.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(threadsData.totalPages, p + 1))}
                disabled={page >= threadsData.totalPages}
                className="text-[11px] font-medium transition-colors disabled:opacity-30"
                style={{ color: 'var(--muted, #8C8C8C)' }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Thread detail / Compose */}
        <div
          className="flex-1 overflow-hidden"
          style={{ background: 'var(--bg, #F5F3EF)' }}
        >
          {showCompose ? (
            <div className="p-6 max-w-2xl mx-auto">
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
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--surface, #fff)', boxShadow: '0 2px 12px rgba(78,94,62,0.06)' }}
                >
                  <img
                    src="/brand_assets/nayara-logo-round.png"
                    alt=""
                    width={28}
                    height={28}
                    style={{ opacity: 0.4 }}
                  />
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--muted, #8C8C8C)' }}>
                  Select a conversation
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
                  Choose a thread to read and reply
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Context panel */}
        {showContext && selectedThreadId && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: 320,
              borderLeft: '1px solid var(--separator, #E5E2DC)',
              background: 'var(--surface, #fff)',
            }}
          >
            <ContactContextPanel
              context={contextData}
              loading={contextLoading}
              onClose={() => setShowContext(false)}
              onThreadClick={(threadId) => {
                setSelectedThreadId(threadId);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
