'use client';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  pending: 'bg-amber-100 text-amber-700 border-amber-300',
  closed: 'bg-slate-100 text-slate-500 border-slate-300',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500',
  normal: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'normal') return null;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal}`}>
      {priority}
    </span>
  );
}
