'use client';

import { useState } from 'react';
import {
  InboxIcon,
  StarIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  TrashIcon,
  TagIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { EmailLabel } from '@/hooks/useEmail';

type FolderKey = 'inbox' | 'starred' | 'sent' | 'archive' | 'trash';

interface EmailSidebarProps {
  activeFolder: FolderKey | string;
  activeLabelId: number | null;
  onSelectFolder: (folder: FolderKey) => void;
  onSelectLabel: (labelId: number) => void;
  unreadCount: number;
  folderCounts: Record<string, number>;
  labels: EmailLabel[];
  accounts: Array<{ id: number; display_name: string; email_address: string; department: string | null }>;
  selectedAccountId: number | null;
  onSelectAccount: (id: number | null) => void;
  onCreateLabel?: (name: string, color: string) => void;
}

const FOLDER_ITEMS: Array<{ key: FolderKey; label: string; icon: React.ElementType; activeIcon?: React.ElementType }> = [
  { key: 'inbox', label: 'Inbox', icon: InboxIcon },
  { key: 'starred', label: 'Starred', icon: StarIcon, activeIcon: StarSolid },
  { key: 'sent', label: 'Sent', icon: PaperAirplaneIcon },
  { key: 'archive', label: 'Archive', icon: ArchiveBoxIcon },
  { key: 'trash', label: 'Trash', icon: TrashIcon },
];

const LABEL_COLORS = [
  '#DC2626', '#EA580C', '#D97706', '#65A30D', '#059669',
  '#0891B2', '#2563EB', '#7C3AED', '#C026D3', '#6B7280',
];

export default function EmailSidebar({
  activeFolder,
  activeLabelId,
  onSelectFolder,
  onSelectLabel,
  unreadCount,
  labels,
  accounts,
  selectedAccountId,
  onSelectAccount,
  onCreateLabel,
}: EmailSidebarProps) {
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[6]);

  const handleCreateLabel = () => {
    if (!newLabelName.trim() || !onCreateLabel) return;
    onCreateLabel(newLabelName.trim(), newLabelColor);
    setNewLabelName('');
    setShowNewLabel(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Folders */}
      <div className="space-y-0.5 mb-4">
        {FOLDER_ITEMS.map(item => {
          const isActive = activeFolder === item.key && !activeLabelId;
          const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
          const count = item.key === 'inbox' ? unreadCount : 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectFolder(item.key)}
              className="group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all"
              style={{
                background: isActive ? 'rgba(170,142,103,0.12)' : 'transparent',
                color: isActive ? 'var(--gold, #AA8E67)' : 'var(--charcoal, #3D3D3D)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--elevated, #F8F6F3)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={{
                  color: isActive ? 'var(--gold, #AA8E67)' : 'var(--muted, #8C8C8C)',
                }}
              />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {count > 0 && (
                <span
                  className="text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
                  style={{
                    background: isActive ? 'var(--gold, #AA8E67)' : 'var(--terra, #EC6C4B)',
                    color: '#fff',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px mx-3 mb-3" style={{ background: 'var(--separator, #E5E2DC)' }} />

      {/* Departments */}
      {accounts.length > 0 && (
        <div className="mb-4">
          <p
            className="text-[10px] uppercase tracking-widest font-bold px-3 mb-1.5"
            style={{ color: 'var(--muted, #8C8C8C)' }}
          >
            Departments
          </p>
          <button
            type="button"
            onClick={() => onSelectAccount(null)}
            className="w-full text-left rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background: selectedAccountId === null ? 'var(--elevated, #F8F6F3)' : 'transparent',
              color: 'var(--charcoal, #3D3D3D)',
            }}
          >
            All accounts
          </button>
          {accounts.map(account => (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelectAccount(account.id)}
              className="w-full text-left rounded-lg px-3 py-1.5 text-[12px] transition-colors truncate"
              style={{
                background: selectedAccountId === account.id ? 'var(--elevated, #F8F6F3)' : 'transparent',
                color: selectedAccountId === account.id ? 'var(--charcoal, #3D3D3D)' : 'var(--muted, #8C8C8C)',
                fontWeight: selectedAccountId === account.id ? 600 : 400,
              }}
            >
              {account.department || account.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="h-px mx-3 mb-3" style={{ background: 'var(--separator, #E5E2DC)' }} />

      {/* Labels */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-1.5">
          <p
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: 'var(--muted, #8C8C8C)' }}
          >
            Labels
          </p>
          {onCreateLabel && (
            <button
              type="button"
              onClick={() => setShowNewLabel(!showNewLabel)}
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--muted, #8C8C8C)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--charcoal, #3D3D3D)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted, #8C8C8C)'; }}
            >
              {showNewLabel ? <XMarkIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* New label form */}
        {showNewLabel && (
          <div className="px-3 mb-2 space-y-2">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Label name"
              className="w-full rounded-md border px-2 py-1 text-[12px] outline-none"
              style={{
                borderColor: 'var(--separator, #E5E2DC)',
                background: 'var(--surface, #fff)',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); }}
              autoFocus
            />
            <div className="flex gap-1 flex-wrap">
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewLabelColor(c)}
                  className="w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: newLabelColor === c ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: newLabelColor === c ? `0 0 0 2px var(--surface, #fff), 0 0 0 3px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim()}
              className="w-full rounded-md py-1 text-[11px] font-semibold transition-opacity disabled:opacity-30"
              style={{ background: 'var(--gold, #AA8E67)', color: '#fff' }}
            >
              Create
            </button>
          </div>
        )}

        {/* Label list */}
        <div className="space-y-0.5">
          {labels.map(label => {
            const isActive = activeLabelId === label.id;
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => onSelectLabel(label.id)}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] transition-colors"
                style={{
                  background: isActive ? 'var(--elevated, #F8F6F3)' : 'transparent',
                  color: isActive ? 'var(--charcoal, #3D3D3D)' : 'var(--muted, #8C8C8C)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <TagIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: label.color }} />
                <span className="truncate">{label.name}</span>
              </button>
            );
          })}
          {labels.length === 0 && !showNewLabel && (
            <p className="px-3 text-[11px] italic" style={{ color: 'var(--muted-dim, #ACACAC)' }}>
              No labels yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
