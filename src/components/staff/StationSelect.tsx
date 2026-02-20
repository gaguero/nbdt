'use client';

const STATIONS = [
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bar', label: 'Bar' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'front_desk', label: 'Front Desk' },
  { id: 'concierge', label: 'Concierge' },
  { id: 'supervisor', label: 'Supervisor' },
  { id: 'management', label: 'Management' },
];

interface StationSelectProps {
  value: string;
  onChange: (station: string) => void;
  className?: string;
}

export function StationSelect({ value, onChange, className = '' }: StationSelectProps) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      <option value="">— No Station —</option>
      {STATIONS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
