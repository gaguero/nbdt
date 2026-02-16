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
      const fetchedItems = activeTab === 'duplicates' ? data.duplicates : data.orphans;
      setItems(fetchedItems);

      // Auto-select rules for duplicates
      if (activeTab === 'duplicates') {
        const autoActions: Record<string, 'merge' | 'delete' | null> = {};
        fetchedItems.forEach((cluster: any) => {
          cluster.members.forEach((member: any, idx: number) => {
            if (idx === 0) return; // Skip primary
            if (member.total_records > 0) {
              autoActions[member.id] = 'merge';
            } else {
              autoActions[member.id] = 'delete';
            }
          });
        });
        setSelectedActions(autoActions);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const [selectedActions, setSelectedActions] = useState<Record<string, 'merge' | 'delete' | null>>({});
  const [processing, setProcessing] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<any | null>(null);

  const toggleAction = (guestId: string, action: 'merge' | 'delete') => {
    setSelectedActions(prev => ({
      ...prev,
      [guestId]: prev[guestId] === action ? null : action
    }));
  };

  const handleProcessSelection = async () => {
    const actionsToRun = Object.entries(selectedActions).filter(([_, action]) => action !== null);
    if (actionsToRun.length === 0) return;

    if (!confirm(ls(`Are you sure you want to process ${actionsToRun.length} actions?`, `¿Está seguro de que desea procesar ${actionsToRun.length} acciones?`))) return;

    setProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const [guestId, action] of actionsToRun) {
      setCurrentProcessingId(guestId);
      try {
        // Find the primary guest ID for this cluster if merging
        let primaryId = null;
        if (action === 'merge') {
          const cluster = items.find(c => c.members.some((m: any) => m.id === guestId));
          primaryId = cluster?.members[0]?.id;
        }

        const res = await fetch('/api/admin/guest-normalization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action, 
            guestId: action === 'delete' ? guestId : undefined,
            primaryId,
            secondaryId: action === 'merge' ? guestId : undefined
          })
        });
        
        if (res.ok) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
      // Small delay for animation feel
      await new Promise(r => setTimeout(r, 400));
    }

    setProcessing(false);
    setCurrentProcessingId(null);
    setSelectedActions({});
    setMessage({ 
      type: successCount > 0 ? 'success' : 'error', 
      text: ls(`Processed: ${successCount} successful, ${failCount} failed.`, `Procesado: ${successCount} exitosos, ${failCount} fallidos.`) 
    });
    fetchData();
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

      {/* Record Detail Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className={`p-4 flex items-center justify-between border-b ${
              activeDetail.type === 'reservation' ? 'bg-blue-600' :
              activeDetail.type === 'transfer' ? 'bg-purple-600' :
              activeDetail.type === 'tour' ? 'bg-yellow-600' : 'bg-orange-600'
            } text-white`}>
              <h3 className="font-black uppercase tracking-widest text-sm">{activeDetail.type} {ls('Detail', 'Detalle')}</h3>
              <button onClick={() => setActiveDetail(null)} className="p-1 hover:bg-white/20 rounded-full">
                <CheckCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {Object.entries(activeDetail.full_detail).map(([key, value]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{key}</p>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{String(value || '—')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button 
                onClick={() => setActiveDetail(null)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                {ls('Close', 'Cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative">
        {/* Floating Action Bar */}
        {Object.values(selectedActions).some(v => v !== null) && (
          <div className="sticky top-0 z-20 bg-blue-600 p-4 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
            <div className="text-white">
              <p className="font-black text-sm uppercase tracking-widest">{ls('Ready to Process', 'Listo para Procesar')}</p>
              <p className="text-xs opacity-90">{Object.values(selectedActions).filter(v => v !== null).length} {ls('actions selected', 'acciones seleccionadas')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedActions({})}
                disabled={processing}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg font-bold text-xs hover:bg-blue-800 disabled:opacity-50"
              >
                {ls('Deselect All', 'Deseleccionar Todo')}
              </button>
              <button
                onClick={handleProcessSelection}
                disabled={processing}
                className="px-6 py-2 bg-white text-blue-600 rounded-lg font-black text-sm hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
              >
              {processing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  {ls('Processing...', 'Procesando...')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  {ls('Execute All Changes', 'Ejecutar Cambios')}
                </>
              )}
            </button>
            </div>
          </div>
        )}

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
              items.map((cluster, i) => (
                <div key={i} className="p-6 space-y-4 border-b last:border-0 bg-gray-50/30">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">{ls('Group', 'Grupo')} #{i+1}</span>
                    <h3 className="font-bold text-gray-900">{cluster.name}</h3>
                    {cluster.email && <span className="text-xs text-gray-500">({cluster.email})</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cluster.members.map((member: any, idx: number) => {
                      const isProcessing = currentProcessingId === member.id;
                      const selected = selectedActions[member.id];

                      return (
                        <div 
                          key={member.id} 
                          className={`bg-white p-4 rounded-xl border-2 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden ${
                            isProcessing ? 'scale-95 opacity-50' : 
                            selected === 'merge' ? 'border-blue-500 bg-blue-50/30' :
                            selected === 'delete' ? 'border-red-500 bg-red-50/30' :
                            'border-gray-200'
                          }`}
                        >
                          {isProcessing && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            </div>
                          )}

                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">
                                {idx === 0 ? (
                                  <span className="text-blue-600">{ls('Master Profile', 'Perfil Maestro')} ({member.res_list?.length > 0 ? ls('Has Reservations', 'Tiene Reservas') : ls('Most Active', 'Más Activo')})</span>
                                ) : ls('Secondary Profile', 'Perfil Secundario')}
                              </p>
                              <p className="font-black text-gray-900">{member.full_name}</p>
                              <p className="text-[10px] text-gray-400">ID: {member.id.slice(0,8)}... • {new Date(member.created_at).toLocaleDateString()}</p>
                            </div>
                            {idx > 0 && (
                              <div className="bg-yellow-100 text-yellow-700 text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
                                {ls('AUTO-SELECTED', 'AUTO-SELECCIONADO')}
                              </div>
                            )}
                          </div>

                                                                                                  <div className="grid grid-cols-2 gap-2">

                                                                                                    <CountBadge 

                                                                                                      items={member.res_list} 

                                                                                                      label={ls('Resv', 'Resv')} 

                                                                                                      color="blue" 

                                                                                                      onItemClick={(it) => setActiveDetail(it)}

                                                                                                      ls={ls}

                                                                                                    />

                                                                                                    <CountBadge 

                                                                                                      items={member.trans_list} 

                                                                                                      label={ls('Trans', 'Trasl')} 

                                                                                                      color="purple" 

                                                                                                      onItemClick={(it) => setActiveDetail(it)}

                                                                                                      ls={ls}

                                                                                                    />

                                                                                                    <CountBadge 

                                                                                                      items={member.tour_list} 

                                                                                                      label={ls('Tours', 'Tours')} 

                                                                                                      color="yellow" 

                                                                                                      onItemClick={(it) => setActiveDetail(it)}

                                                                                                      ls={ls}

                                                                                                    />

                                                                                                    <CountBadge 

                                                                                                      items={member.req_list} 

                                                                                                      label={ls('Reqs', 'Sol')} 

                                                                                                      color="orange" 

                                                                                                      onItemClick={(it) => setActiveDetail(it)}

                                                                                                      ls={ls}

                                                                                                    />

                                                                                                  </div>

                                                                          

                                                  
                                                    {/* Action Selectors */}
                          <div className="pt-2 mt-auto border-t border-gray-100 flex gap-2">
                            {idx === 0 ? (
                              <div className="w-full text-center py-2 text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 rounded border border-green-100">
                                {ls('Master Profile', 'Perfil Maestro')}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleAction(member.id, 'merge')}
                                  disabled={processing}
                                  className={`flex-1 py-2 rounded text-[10px] font-black uppercase transition-colors border ${
                                    selected === 'merge' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                                  }`}
                                >
                                  {ls('Merge', 'Fusionar')}
                                </button>
                                <button
                                  onClick={() => toggleAction(member.id, 'delete')}
                                  disabled={processing}
                                  className={`flex-1 py-2 rounded text-[10px] font-black uppercase transition-colors border ${
                                    selected === 'delete' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                                  }`}
                                >
                                  {ls('Delete', 'Eliminar')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                            <div key={s.id} className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-blue-700">{s.full_name}</p>
                                <div className="flex gap-1 mt-1">
                                  <CountBadge items={new Array(s.res_count || 0).fill({})} label="Res" color="blue" onItemClick={() => {}} ls={ls} />
                                  <CountBadge items={new Array(s.trans_count || 0).fill({})} label="Tra" color="purple" onItemClick={() => {}} ls={ls} />
                                </div>
                              </div>
                              <button
                                onClick={() => handleLink(orphan.id, s.id)}
                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                title={ls('Link to this guest', 'Vincular a este huésped')}
                              >
                                <LinkIcon className="h-4 w-4" />
                              </button>
                            </div>
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

function CountBadge({ items, label, color, onItemClick, ls }: { items: any[], label: string, color: string, onItemClick: (it: any) => void, ls: any }) {
  const count = items?.length || 0;
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  };

  return (
    <div className={`group relative flex items-center justify-between px-2 py-1 rounded border text-[10px] font-bold ${colors[color]}`}>
      <span>{label}</span>
      <span className="bg-white/50 px-1.5 rounded-full">{count}</span>

      {/* Persistent Popover */}
      {count > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[50] w-56 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label} {ls('Records', 'Registros')}</span>
            <span className="text-[10px] font-bold text-gray-400">{count}</span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
            {items.map((it: any, i: number) => (
              <button
                key={it.id || i}
                onClick={() => onItemClick(it)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors group/item"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold text-gray-700 leading-tight group-hover/item:text-blue-700">{it.info}</p>
                  <LinkIcon className="h-3 w-3 text-gray-300 group-hover/item:text-blue-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );
}
