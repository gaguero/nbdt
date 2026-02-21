'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { DataCurationNav } from '@/components/staff/DataCurationNav';
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
      <DataCurationNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>{ls('Guest Normalization Wizard', 'Mago de Normalización de Huéspedes')}</h1>
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>{ls('Clean up duplicates and fix reservation links.', 'Limpie duplicados y corrija enlaces de reservaciones.')}</p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-lg flex items-center gap-3" style={
          message.type === 'success'
            ? { background: 'rgba(78,94,62,0.10)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }
            : { background: 'rgba(236,108,75,0.10)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.2)' }
        }>
          {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-xs underline">{ls('Dismiss', 'Cerrar')}</button>
        </div>
      )}

      {/* Record Detail Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(14,26,9,0.52)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200" style={{ background: 'var(--surface)' }}>
            <div className="p-4 flex items-center justify-between" style={{ background: 'var(--sidebar-bg)', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="font-black uppercase tracking-widest text-sm">{activeDetail.type} {ls('Detail', 'Detalle')}</h3>
              <button onClick={() => setActiveDetail(null)} className="p-1 rounded-full" style={{ transition: 'background 0.2s' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}>
                <CheckCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {Object.entries(activeDetail.full_detail).map(([key, value]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: 'var(--muted-dim)' }}>{key}</p>
                    <p className="text-sm font-bold leading-tight" style={{ color: 'var(--charcoal)' }}>{String(value || '—')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 flex justify-end" style={{ background: 'var(--elevated)', borderTop: '1px solid var(--separator)' }}>
              <button
                onClick={() => setActiveDetail(null)}
                className="nayara-btn nayara-btn-primary px-6 py-2 text-xs uppercase tracking-widest"
              >
                {ls('Close', 'Cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex" style={{ borderBottom: '1px solid var(--separator)' }}>
        <button
          onClick={() => setActiveTab('duplicates')}
          className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
          style={activeTab === 'duplicates'
            ? { borderBottomColor: 'var(--gold)', color: 'var(--gold)' }
            : { borderBottomColor: 'transparent', color: 'var(--muted-dim)' }}
        >
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5" />
            {ls('Potential Duplicates', 'Posibles Duplicados')}
            {activeTab === 'duplicates' && items.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(170,142,103,0.15)', color: 'var(--gold)' }}>{items.length}</span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('orphans')}
          className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
          style={activeTab === 'orphans'
            ? { borderBottomColor: 'var(--gold)', color: 'var(--gold)' }
            : { borderBottomColor: 'transparent', color: 'var(--muted-dim)' }}
        >
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {ls('Unlinked Reservations', 'Reservas sin Enlace')}
            {activeTab === 'orphans' && items.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(170,142,103,0.15)', color: 'var(--gold)' }}>{items.length}</span>
            )}
          </div>
        </button>
      </div>

      <div className="nayara-card overflow-hidden relative">
        {/* Floating Action Bar */}
        {Object.values(selectedActions).some(v => v !== null) && (
          <div className="sticky top-0 z-20 p-4 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300" style={{ background: 'var(--sage)', color: '#fff' }}>
            <div className="text-white">
              <p className="font-black text-sm uppercase tracking-widest">{ls('Ready to Process', 'Listo para Procesar')}</p>
              <p className="text-xs opacity-90">{Object.values(selectedActions).filter(v => v !== null).length} {ls('actions selected', 'acciones seleccionadas')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedActions({})}
                disabled={processing}
                className="px-4 py-2 rounded-lg font-bold text-xs disabled:opacity-50"
                style={{ background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              >
                {ls('Deselect All', 'Deseleccionar Todo')}
              </button>
              <button
                onClick={handleProcessSelection}
                disabled={processing}
                className="px-6 py-2 rounded-lg font-black text-sm disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#fff', color: 'var(--sage)' }}
              >
              {processing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--sage)', borderTopColor: 'transparent' }}></div>
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
          <div className="p-12 text-center" style={{ color: 'var(--muted-dim)' }}>
            <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}></div>
            {ls('Scanning database...', 'Escaneando base de datos...')}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--muted-dim)' }}>
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--sage)' }} />
            <p className="font-medium" style={{ color: 'var(--charcoal)' }}>{ls('Everything looks clean!', '¡Todo parece estar limpio!')}</p>
            <p className="text-sm">{ls('No issues found in this category.', 'No se encontraron problemas en esta categoría.')}</p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--separator)' }}>
            {activeTab === 'duplicates' ? (
              items.map((cluster, i) => (
                <div key={i} className="p-6 space-y-4" style={{ borderBottom: '1px solid var(--separator)', background: 'var(--elevated)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ background: 'var(--gold)', color: '#fff' }}>{ls('Group', 'Grupo')} #{i+1}</span>
                    <h3 className="font-bold" style={{ color: 'var(--charcoal)' }}>{cluster.name}</h3>
                    {cluster.email && <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>({cluster.email})</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cluster.members.map((member: any, idx: number) => {
                      const isProcessing = currentProcessingId === member.id;
                      const selected = selectedActions[member.id];

                      return (
                        <div
                          key={member.id}
                          className="p-4 rounded-xl border-2 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden"
                          style={{
                            background: 'var(--surface)',
                            borderColor: isProcessing ? 'var(--muted-dim)' :
                              selected === 'merge' ? 'var(--gold)' :
                              selected === 'delete' ? 'var(--terra)' :
                              'var(--separator)',
                            opacity: isProcessing ? 0.5 : 1,
                            transform: isProcessing ? 'scale(0.97)' : 'scale(1)',
                          }}
                        >
                          {isProcessing && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(1px)' }}>
                              <div className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}></div>
                            </div>
                          )}

                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>
                                {idx === 0 ? (
                                  <span style={{ color: 'var(--gold)' }}>{ls('Master Profile', 'Perfil Maestro')} ({member.res_list?.length > 0 ? ls('Has Reservations', 'Tiene Reservas') : ls('Most Active', 'Más Activo')})</span>
                                ) : ls('Secondary Profile', 'Perfil Secundario')}
                              </p>
                              <p className="font-black" style={{ color: 'var(--charcoal)' }}>{member.full_name}</p>
                              <p className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>ID: {member.id.slice(0,8)}... • {new Date(member.created_at).toLocaleDateString()}</p>
                            </div>
                            {idx > 0 && (
                              <div className="text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse" style={{ background: 'rgba(170,142,103,0.15)', color: 'var(--gold)' }}>
                                {ls('AUTO-SELECTED', 'AUTO-SELECCIONADO')}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <CountBadge
                              items={member.res_list}
                              label={ls('Resv', 'Resv')}
                              color="gold"
                              onItemClick={(it) => setActiveDetail(it)}
                              ls={ls}
                            />
                            <CountBadge
                              items={member.trans_list}
                              label={ls('Trans', 'Trasl')}
                              color="sage"
                              onItemClick={(it) => setActiveDetail(it)}
                              ls={ls}
                            />
                            <CountBadge
                              items={member.tour_list}
                              label={ls('Tours', 'Tours')}
                              color="muted"
                              onItemClick={(it) => setActiveDetail(it)}
                              ls={ls}
                            />
                            <CountBadge
                              items={member.req_list}
                              label={ls('Reqs', 'Sol')}
                              color="terra"
                              onItemClick={(it) => setActiveDetail(it)}
                              ls={ls}
                            />
                          </div>

                          {/* Action Selectors */}
                          <div className="pt-2 mt-auto flex gap-2" style={{ borderTop: '1px solid var(--separator)' }}>
                            {idx === 0 ? (
                              <div className="w-full text-center py-2 text-[10px] font-black uppercase tracking-widest rounded" style={{ background: 'rgba(78,94,62,0.1)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }}>
                                {ls('Master Profile', 'Perfil Maestro')}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleAction(member.id, 'merge')}
                                  disabled={processing}
                                  className="flex-1 py-2 rounded text-[10px] font-black uppercase border"
                                  style={
                                    selected === 'merge'
                                      ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' }
                                      : { background: 'var(--surface)', color: 'var(--gold)', borderColor: 'rgba(170,142,103,0.3)' }
                                  }
                                >
                                  {ls('Merge', 'Fusionar')}
                                </button>
                                <button
                                  onClick={() => toggleAction(member.id, 'delete')}
                                  disabled={processing}
                                  className="flex-1 py-2 rounded text-[10px] font-black uppercase border"
                                  style={
                                    selected === 'delete'
                                      ? { background: 'var(--terra)', color: '#fff', borderColor: 'var(--terra)' }
                                      : { background: 'var(--surface)', color: 'var(--terra)', borderColor: 'rgba(236,108,75,0.3)' }
                                  }
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
                <div key={orphan.id} className="p-6 flex flex-col md:flex-row gap-6" style={{ borderBottom: '1px solid var(--separator)' }}>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'rgba(236,108,75,0.1)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.2)' }}>
                        {orphan.guest_id ? ls('Mismatched', 'Desajuste') : ls('Orphan', 'Huérfano')}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>Resv: {orphan.opera_resv_id}</span>
                    </div>
                    <h3 className="text-xl font-black leading-tight" style={{ color: 'var(--charcoal)' }}>{orphan.opera_guest_name}</h3>
                    <div className="flex gap-4 text-xs" style={{ color: 'var(--muted-dim)' }}>
                      <span><strong>{ls('Room', 'Hab')}:</strong> {orphan.room}</span>
                      <span><strong>{ls('Arrival', 'Llegada')}:</strong> {new Date(orphan.arrival).toLocaleDateString()}</span>
                    </div>
                    {orphan.linked_guest_name && (
                      <p className="text-xs font-medium italic" style={{ color: 'var(--terra)' }}>
                        {ls('Currently linked to:', 'Vinculado actualmente a:')} {orphan.linked_guest_name}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 pl-6 space-y-4" style={{ borderLeft: '1px solid var(--separator)' }}>
                    {/* Auto-suggestions */}
                    {orphan.suggestions && orphan.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-tight flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                          <CheckCircleIcon className="h-3 w-3" />
                          {ls('Smart Matches Found', 'Coincidencias Inteligentes')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {orphan.suggestions.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(170,142,103,0.07)', border: '1px solid rgba(170,142,103,0.2)' }}>
                              <div className="flex-1">
                                <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{s.full_name}</p>
                                <div className="flex gap-1 mt-1">
                                  <CountBadge items={new Array(s.res_count || 0).fill({ info: 'Existing' })} label="Res" color="gold" onItemClick={() => {}} ls={ls} />
                                  <CountBadge items={new Array(s.trans_count || 0).fill({ info: 'Existing' })} label="Tra" color="sage" onItemClick={() => {}} ls={ls} />
                                  <CountBadge items={new Array(s.tour_count || 0).fill({ info: 'Existing' })} label="Tou" color="muted" onItemClick={() => {}} ls={ls} />
                                  <CountBadge items={new Array(s.req_count || 0).fill({ info: 'Existing' })} label="Req" color="terra" onItemClick={() => {}} ls={ls} />
                                </div>
                              </div>
                              <button
                                onClick={() => handleLink(orphan.id, s.id)}
                                className="p-1 rounded"
                                style={{ background: 'var(--gold)', color: '#fff' }}
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
                      <p className="text-xs font-bold uppercase" style={{ color: 'var(--muted-dim)' }}>{ls('Manual Search', 'Búsqueda Manual')}</p>
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5" style={{ color: 'var(--muted-dim)' }} />
                        <input
                          type="text"
                          placeholder={ls('Search guest database...', 'Buscar en base de datos...')}
                          className="nayara-input w-full pl-9"
                          onChange={(e) => searchGuests(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {searchResults.map(g => (
                        <button
                          key={g.id}
                          onClick={() => handleLink(orphan.id, g.id)}
                          className="w-full text-left p-2 rounded group flex items-center justify-between"
                          style={{ transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--elevated)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}
                        >
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--charcoal)' }}>{g.full_name}</p>
                            <p className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>{g.email || 'No email'}</p>
                          </div>
                          <LinkIcon className="h-4 w-4" style={{ color: 'var(--muted-dim)' }} />
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
  const styles: Record<string, React.CSSProperties> = {
    gold: { background: 'rgba(170,142,103,0.1)', color: 'var(--gold)', border: '1px solid rgba(170,142,103,0.25)' },
    sage: { background: 'rgba(78,94,62,0.1)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.25)' },
    terra: { background: 'rgba(236,108,75,0.1)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.25)' },
    muted: { background: 'var(--elevated)', color: 'var(--muted-dim)', border: '1px solid var(--separator)' },
  };

  return (
    <div className="group relative flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold" style={styles[color] ?? styles.muted}>
      <span>{label}</span>
      <span className="px-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }}>{count}</span>

      {/* Persistent Popover */}
      {count > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[50] w-56 rounded-xl shadow-2xl overflow-hidden pointer-events-auto" style={{ background: 'var(--surface)', border: '1px solid var(--separator)' }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--separator)' }}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-dim)' }}>{label} {ls('Records', 'Registros')}</span>
            <span className="text-[10px] font-bold" style={{ color: 'var(--muted-dim)' }}>{count}</span>
          </div>
          <div className="max-h-48 overflow-y-auto" style={{ borderTop: '1px solid var(--separator)' }}>
            {items.map((it: any, i: number) => (
              <button
                key={it.id || i}
                onClick={() => onItemClick(it)}
                className="w-full text-left px-3 py-2.5 group/item"
                style={{ borderBottom: '1px solid var(--separator)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold leading-tight" style={{ color: 'var(--muted)' }}>{it.info}</p>
                  <LinkIcon className="h-3 w-3 shrink-0" style={{ color: 'var(--muted-dim)' }} />
                </div>
              </button>
            ))}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent" style={{ borderTopColor: 'var(--surface)' }}></div>
        </div>
      )}
    </div>
  );
}
