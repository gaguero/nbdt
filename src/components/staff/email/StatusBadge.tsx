'use client';

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  open: { bg: 'rgba(5,150,105,0.08)', color: '#059669', border: 'rgba(5,150,105,0.2)' },
  pending: { bg: 'rgba(217,119,6,0.08)', color: '#D97706', border: 'rgba(217,119,6,0.2)' },
  closed: { bg: 'rgba(107,114,128,0.08)', color: '#6B7280', border: 'rgba(107,114,128,0.2)' },
};

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: 'rgba(107,114,128,0.08)', color: '#6B7280' },
  normal: { bg: 'rgba(37,99,235,0.08)', color: '#2563EB' },
  high: { bg: 'rgba(234,88,12,0.08)', color: '#EA580C' },
  urgent: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'normal') return null;
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal;
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      {priority}
    </span>
  );
}
