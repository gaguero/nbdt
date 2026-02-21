'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, TruckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Vendor {
  id: string;
  name: string;
  type: string;
}

interface VendorSearchSelectProps {
  value: string;
  onChange: (id: string, name?: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  type?: string;
}

export function VendorSearchSelect({ value, onChange, placeholder = 'Search vendor...', label, error, type }: VendorSearchSelectProps) {
  const [query, setSearchQuery] = useState('');
  const [results, setResults] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      if (!selectedName) {
        // Find in initial common vendors or fetch
        fetch(`/api/vendors?id=${value}`)
          .then(r => r.json())
          .then(data => {
            if (data.vendor) setSelectedName(data.vendor.name);
          })
          .catch(() => {});
      }
    } else {
      setSelectedName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && !query && results.length === 0) {
      // Fetch initial set of vendors
      setLoading(true);
      fetch(`/api/vendors?limit=10${type ? `&type=${type}` : ''}`)
        .then(r => r.json())
        .then(data => {
          setResults(data.vendors ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!query) return;

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/vendors?search=${encodeURIComponent(query)}&limit=10${type ? `&type=${type}` : ''}`)
        .then(r => r.json())
        .then(data => {
          setResults(data.vendors ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, type]);

  const handleSelect = (vendor: Vendor) => {
    setSelectedName(vendor.name);
    onChange(vendor.id, vendor.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedName('');
    onChange('', '');
    setSearchQuery('');
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      {label && <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>}
      
      <div className="relative">
        {selectedName ? (
          <div className="flex items-center justify-between w-full px-3 py-2 border border-purple-200 bg-purple-50 rounded-lg text-sm font-bold text-purple-700 shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <TruckIcon className="h-4 w-4" />
              <span className="truncate">{selectedName}</span>
            </div>
            <button onClick={handleClear} className="p-0.5 hover:bg-purple-100 rounded-full transition-colors">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${error ? 'border-red-300' : 'border-gray-300'}`}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
          </div>
        )}

        {isOpen && !selectedName && (
          <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {loading && results.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-500 italic flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Loading vendors...
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {results.map((vendor) => (
                  <button
                    key={vendor.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex flex-col"
                    onClick={() => handleSelect(vendor)}
                  >
                    <span className="text-sm font-bold text-gray-900">{vendor.name}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{vendor.type}</span>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="px-4 py-3 text-xs text-gray-500 italic">No vendors found</div>
            ) : null}
          </div>
        )}
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 uppercase">{error}</p>}
    </div>
  );
}
