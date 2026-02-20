'use client';

import { ROLES_CONFIG } from '@/lib/roles';

interface RolesSelectProps {
  value: string;
  onChange: (role: string) => void;
  className?: string;
}

export function RolesSelect({ value, onChange, className = '' }: RolesSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      <option value="">Select a role...</option>
      {Object.entries(ROLES_CONFIG).map(([key, config]) => (
        <option key={key} value={key}>
          {config.label}
        </option>
      ))}
    </select>
  );
}
