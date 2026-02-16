'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { 
  UserGroupIcon, 
  LinkIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

type Tab = 'duplicates' | 'orphans';

export default function GuestNormalizationPage() {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>('duplicates');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/guest-normalization?mode=${activeTab}`);
      const data = await res.json();
      setItems(activeTab === 'duplicates' ? data.duplicates : data.orphans);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleMerge = async (primaryId: string, secondaryId: string) => {
    if (!confirm(ls('Are you sure you want to merge these guests? This cannot be undone.', '¿Está seguro de que desea fusionar estos huéspedes? Esto no se puede deshacer.'))) return;
    
    try {
      const res = await fetch('/api/admin/guest-normalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', primaryId, secondaryId })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleLink = async (reservationId: string, guestId: string) => {
    try {
      const res = await fetch('/api/admin/guest-normalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', reservationId, primaryId: guestId })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
        setSearchResults([]);
        setSearchQuery('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const searchGuests = async (query: string) => {
    if (query.length < 2) return;
    try {
      const res = await fetch(`/api/guests?search=${query}`);
      const data = await res.json();
      setSearchResults(data.guests || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ls('Guest Normalization Wizard', 'Mago de Normalización de Huéspedes')}</h1>
          <p className="text-sm text-gray-500">{ls('Clean up duplicates and fix reservation links.', 'Limpie duplicados y corrija enlaces de reservaciones.')}</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-xs underline">{ls('Dismiss', 'Cerrar')}</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'duplicates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5" />
            {ls('Potential Duplicates', 'Posibles Duplicados')}
            {activeTab === 'duplicates' && items.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{items.length}</span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('orphans')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'orphans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {ls('Unlinked Reservations', 'Reservas sin Enlace')}
            {activeTab === 'orphans' && items.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{items.length}</span>
            )}
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            {ls('Scanning database...', 'Escaneando base de datos...')}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="font-medium text-gray-900">{ls('Everything looks clean!', '¡Todo parece estar limpio!')}</p>
            <p className="text-sm">{ls('No issues found in this category.', 'No se encontraron problemas en esta categoría.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeTab === 'duplicates' ? (
              items.map((dup, i) => (
                <div key={i} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{ls('Guest A (Keep)', 'Huésped A (Mantener)')}</p>
                    <p className="font-bold text-gray-900">{dup.name1}</p>
                    <p className="text-xs text-gray-500">{dup.email1 || ls('No email', 'Sin correo')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">ID: {dup.id1.slice(0,8)}... • {new Date(dup.date1).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-px w-full bg-gray-200 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white px-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">{ls('Merge Into', 'Fusionar En')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleMerge(dup.id1, dup.id2)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"
                    >
                      {ls('Execute Merge', 'Ejecutar Fusión')}
                    </button>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs font-bold text-red-400 uppercase mb-1">{ls('Guest B (Delete)', 'Huésped B (Eliminar)')}</p>
                    <p className="font-bold text-gray-900">{dup.name2}</p>
                    <p className="text-xs text-gray-500">{dup.email2 || ls('No email', 'Sin correo')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">ID: {dup.id2.slice(0,8)}... • {new Date(dup.date2).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              items.map((orphan) => (
                <div key={orphan.id} className="p-6 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">
                        {orphan.guest_id ? ls('Mismatched', 'Desajuste') : ls('Orphan', 'Huérfano')}
                      </span>
                      <span className="text-xs text-gray-400">Resv: {orphan.opera_resv_id}</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">{orphan.opera_guest_name}</h3>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span><strong>{ls('Room', 'Hab')}:</strong> {orphan.room}</span>
                      <span><strong>{ls('Arrival', 'Llegada')}:</strong> {new Date(orphan.arrival).toLocaleDateString()}</span>
                    </div>
                    {orphan.linked_guest_name && (
                      <p className="text-xs text-red-500 font-medium italic">
                        {ls('Currently linked to:', 'Vinculado actualmente a:')} {orphan.linked_guest_name}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 border-l pl-6 space-y-4">
                    {/* Auto-suggestions */}
                    {orphan.suggestions && orphan.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-tight flex items-center gap-1">
                          <CheckCircleIcon className="h-3 w-3" />
                          {ls('Smart Matches Found', 'Coincidencias Inteligentes')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {orphan.suggestions.map((s: any) => (
                            <button
                              key={s.id}
                              onClick={() => handleLink(orphan.id, s.id)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-2"
                            >
                              {s.full_name}
                              <LinkIcon className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">{ls('Manual Search', 'Búsqueda Manual')}</p>
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder={ls('Search guest database...', 'Buscar en base de datos...')}
                          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          onChange={(e) => searchGuests(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {searchResults.map(g => (
                        <button 
                          key={g.id}
                          onClick={() => handleLink(orphan.id, g.id)}
                          className="w-full text-left p-2 rounded hover:bg-blue-50 group flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-800">{g.full_name}</p>
                            <p className="text-[10px] text-gray-500">{g.email || 'No email'}</p>
                          </div>
                          <LinkIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
