'use client';

interface Activity {
  id: number;
  action: string;
  performer_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  assigned: 'Reassigned',
  status_changed: 'Changed status',
  replied: 'Replied',
  forwarded: 'Forwarded',
  note_added: 'Added note',
  linked_guest: 'Linked guest',
  tagged: 'Updated tags',
  updated: 'Updated',
  starred: 'Starred',
  archived: 'Archived',
};

export default function EmailActivityLog({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4
        className="text-[9px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--muted, #8C8C8C)' }}
      >
        Activity
      </h4>
      <div className="space-y-1">
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-2 text-[10px]">
            <span
              className="flex-shrink-0 w-28 tabular-nums"
              style={{ color: 'var(--muted-dim, #ACACAC)' }}
            >
              {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
              {new Date(a.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ color: 'var(--muted, #8C8C8C)' }}>
              <span className="font-semibold" style={{ color: 'var(--charcoal, #3D3D3D)' }}>
                {a.performer_name || 'System'}
              </span>
              {' '}
              {ACTION_LABELS[a.action] || a.action}
              {a.details?.to_status ? ` to ${a.details.to_status}` : ''}
              {a.details?.to ? ` to ${Array.isArray(a.details.to) ? (a.details.to as string[]).join(', ') : a.details.to}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
