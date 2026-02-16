'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: string[];
  placeholder?: string;
  value?: string;
}

export function FilterBar({
  filters,
  onFilterChange,
  onClear,
}: {
  filters: FilterConfig[];
  onFilterChange: (id: string, value: string) => void;
  onClear: () => void;
}) {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const activeCount = filters.filter(f => f.value && f.value.trim()).length;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(filter => (
          <div key={filter.id} className="relative">
            {filter.type === 'select' ? (
              <div className="relative">
                <button
                  onClick={() =>
                    setExpandedFilter(expandedFilter === filter.id ? null : filter.id)
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    filter.value
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {filter.label}
                  {filter.value && `: ${filter.value}`}
                </button>
                {expandedFilter === filter.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-max">
                    {filter.options?.map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          onFilterChange(filter.id, opt);
                          setExpandedFilter(null);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                value={filter.value || ''}
                onChange={e => onFilterChange(filter.id, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder={filter.placeholder}
              />
            ) : (
              <input
                type="text"
                placeholder={filter.placeholder || filter.label}
                value={filter.value || ''}
                onChange={e => onFilterChange(filter.id, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            )}
          </div>
        ))}

        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
            Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
