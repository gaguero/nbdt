/**
 * Centralized status badge color mapping for all concierge pages.
 */

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  vendor_confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-500',
  resolved: 'bg-gray-100 text-gray-500',
};

export const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500';
}

export function priorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-500';
}
