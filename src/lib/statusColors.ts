/**
 * Centralized status badge color mapping — V13 Slate Botanical design system.
 * Returns CSS class names that map to .nayara-badge-* defined in globals.css.
 */

export const STATUS_COLORS: Record<string, string> = {
  pending:          'nayara-badge nayara-badge-pending',
  confirmed:        'nayara-badge nayara-badge-confirmed',
  vendor_confirmed: 'nayara-badge nayara-badge-vendor-confirmed',
  in_progress:      'nayara-badge nayara-badge-in-progress',
  completed:        'nayara-badge nayara-badge-completed',
  cancelled:        'nayara-badge nayara-badge-cancelled',
  no_show:          'nayara-badge nayara-badge-no-show',
  resolved:         'nayara-badge nayara-badge-resolved',
  en_route:         'nayara-badge nayara-badge-en-route',
};

export const PRIORITY_COLORS: Record<string, string> = {
  normal: 'nayara-badge nayara-badge-low',
  low:    'nayara-badge nayara-badge-low',
  high:   'nayara-badge nayara-badge-high',
  urgent: 'nayara-badge nayara-badge-high',
  medium: 'nayara-badge nayara-badge-medium',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'nayara-badge nayara-badge-cancelled';
}

export function priorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] ?? 'nayara-badge nayara-badge-low';
}
