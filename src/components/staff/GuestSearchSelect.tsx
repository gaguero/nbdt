'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Guest {
  id: string;
  full_name: string;
  email?: string;
  room?: string;
}

interface GuestSearchSelectProps {
  value: string;
  onChange: (id: string, name?: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function GuestSearchSelect({ value, onChange, placeholder = 'Search guest...', label, error }: GuestSearchSelectProps) {
  const [query, setSearchQuery] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      // If we have a value but no name, fetch it or find it
      if (!selectedName) {
        fetch(`/api/guests?id=${value}`)
          .then(r => r.json())
          .then(data => {
            if (data.guest) setSelectedName(data.guest.full_name);
          })
          .catch(() => {});
      }
    } else {
      setSelectedName('');
    }
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
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/guests?search=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(data => {
          setResults(data.guests ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (guest: Guest) => {
    setSelectedName(guest.full_name);
    onChange(guest.id, guest.full_name);
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
          <div className="flex items-center justify-between w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm font-bold text-blue-700 shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <UserIcon className="h-4 w-4" />
              <span className="truncate">{selectedName}</span>
            </div>
            <button onClick={handleClear} className="p-0.5 hover:bg-blue-100 rounded-full transition-colors">
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

        {isOpen && (query.length >= 2 || results.length > 0) && !selectedName && (
          <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {loading ? (
              <div className="px-4 py-3 text-xs text-gray-500 italic flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {results.map((guest) => (
                  <button
                    key={guest.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex flex-col"
                    onClick={() => handleSelect(guest)}
                  >
                    <span className="text-sm font-bold text-gray-900">{guest.full_name}</span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-2">
                      {guest.room && <span className="font-bold text-blue-600">Room {guest.room}</span>}
                      {guest.email && <span>{guest.email}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="px-4 py-3 text-xs text-gray-500 italic">No guests found</div>
            ) : null}
          </div>
        )}
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 uppercase">{error}</p>}
    </div>
  );
}
