'use client';

import { PERMISSIONS, Permission } from '@/lib/permissions';
import { getRolePermissions } from '@/lib/roles';
import { useMemo } from 'react';

interface PermissionsPickerProps {
  role: string;
  value: Permission[]; // Custom permissions
  onChange: (permissions: Permission[]) => void;
}

export function PermissionsPicker({ role, value, onChange }: PermissionsPickerProps) {
  const rolePermissions = useMemo(() => new Set(getRolePermissions(role)), [role]);
  
  const categories = useMemo(() => {
    const cats: Record<string, Permission[]> = {};
    Object.values(PERMISSIONS).forEach(p => {
      const prefix = p.split(':')[0];
      if (!cats[prefix]) cats[prefix] = [];
      cats[prefix].push(p);
    });
    return cats;
  }, []);

  const togglePermission = (p: Permission) => {
    if (rolePermissions.has(p)) return; // Cannot toggle default role permissions
    
    if (value.includes(p)) {
      onChange(value.filter(v => v !== p));
    } else {
      onChange([...value, p]);
    }
  };

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
      {Object.entries(categories).map(([category, perms]) => (
        <div key={category}>
          <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">{category}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {perms.map(p => {
              const isDefault = rolePermissions.has(p);
              const isChecked = isDefault || value.includes(p);
              
              return (
                <label key={p} className={`flex items-center space-x-2 text-sm ${isDefault ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDefault}
                    onChange={() => togglePermission(p)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={isDefault ? 'font-medium text-gray-700' : 'text-gray-900'}>
                    {p}
                    {isDefault && <span className="ml-1 text-[10px] text-gray-500">(Role)</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
