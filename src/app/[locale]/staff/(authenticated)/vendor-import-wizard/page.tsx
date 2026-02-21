'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { DataCurationNav } from '@/components/staff/DataCurationNav';
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  TableCellsIcon,
  ChevronDownIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';

type VendorAction = 'CREATE' | 'UPDATE' | 'CONFLICT' | 'SKIP';

interface AnalysisRow {
  csv: {
    legacyId: string;
    name: string;
    phone: string;
    email: string;
    rawType: string;
    type: string;
    colorCode: string;
    notes: string;
    isActive: boolean;
  };
  match: {
    id: string;
    name: string;
    legacyId: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  action: VendorAction;
  reason: string;
}

interface AnalysisResult {
  summary: {
    total: number;
    create: number;
    update: number;
    conflict: number;
    skip: number;
    withLegacyId: number;
  };
  analysis: AnalysisRow[];
}

export default function VendorImportWizardPage() {
  const locale = useLocale();
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSkip, setExpandedSkip] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ls = (en: string, es: string) => (locale === 'es' ? es : en);

  const recalcSummary = (analysis: AnalysisRow[]) => ({
    total: analysis.length,
    create: analysis.filter((item) => item.action === 'CREATE').length,
    update: analysis.filter((item) => item.action === 'UPDATE').length,
    conflict: analysis.filter((item) => item.action === 'CONFLICT').length,
    skip: analysis.filter((item) => item.action === 'SKIP').length,
    withLegacyId: analysis.filter((item) => item.csv.legacyId).length,
  });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setResults(null);
    setExpandedSkip(false);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/vendor-analysis', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to analyze vendor CSV' });
        return;
      }
      setResults(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const setRowAction = (index: number, action: VendorAction, reason: string) => {
    if (!results) return;
    const analysis = results.analysis.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, action, reason };
    });
    setResults({
      summary: recalcSummary(analysis),
      analysis,
    });
  };

  const executeImport = async () => {
    if (!results) return;
    const rowsToImport = results.analysis.filter((item) => item.action === 'CREATE' || item.action === 'UPDATE');
    if (rowsToImport.length === 0) {
      setMessage({ type: 'error', text: ls('No rows selected to import.', 'No hay filas seleccionadas para importar.') });
      return;
    }

    if (
      !confirm(
        ls(
          `Proceed with importing ${rowsToImport.length} vendors?`,
          `Proceder con la importacion de ${rowsToImport.length} vendedores?`
        )
      )
    ) {
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/admin/vendor-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error || 'Vendor import failed' });
        return;
      }

      setMessage({
        type: 'success',
        text: ls(
          `Import complete: ${data.result.created} created, ${data.result.updated} updated.`,
          `Importacion completada: ${data.result.created} creados, ${data.result.updated} actualizados.`
        ),
      });
      setResults(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  const mainRows = results?.analysis.filter((item) => item.action !== 'SKIP') ?? [];
  const skipRows = results?.analysis
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.action === 'SKIP') ?? [];
  const actionableRows = results?.analysis.filter((item) => item.action === 'CREATE' || item.action === 'UPDATE') ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <DataCurationNav />
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
          {ls('Vendor Import Wizard', 'Asistente de Importacion de Vendedores')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>
          {ls(
            'Upload, review, and import vendors while preserving legacy AppSheet vendor IDs.',
            'Sube, revisa e importa vendedores preservando los IDs legacy de AppSheet.'
          )}
        </p>
      </div>

      {!results && !analyzing && (
        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl p-12 text-center cursor-pointer group"
          style={{ border: '2px dashed var(--separator)', transition: 'border-color 0.2s, background 0.2s' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)';
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(170,142,103,0.04)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--separator)';
            (e.currentTarget as HTMLDivElement).style.background = '';
          }}
        >
          <CloudArrowUpIcon className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--muted-dim)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--muted)' }}>{ls('Upload Vendor CSV', 'Subir CSV de Vendedores')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>{ls('Only .csv files supported', 'Solo archivos .csv soportados')}</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        </div>
      )}

      {analyzing && (
        <div className="p-20 text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
          <p className="font-black uppercase tracking-widest" style={{ color: 'var(--charcoal)' }}>
            {ls('Analyzing Vendor Data...', 'Analizando Datos de Vendedores...')}
          </p>
        </div>
      )}

      {results && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <SummaryCard label={ls('Total Rows', 'Total')} value={results.summary.total} icon={TableCellsIcon} color="muted" />
            <SummaryCard label={ls('Creates', 'Nuevos')} value={results.summary.create} icon={UserPlusIcon} color="sage" />
            <SummaryCard label={ls('Updates', 'Actualizaciones')} value={results.summary.update} icon={ArrowPathIcon} color="gold" />
            <SummaryCard label={ls('Conflicts', 'Conflictos')} value={results.summary.conflict} icon={ExclamationCircleIcon} color="terra" />
            <SummaryCard label={ls('Legacy IDs', 'IDs Legacy')} value={results.summary.withLegacyId} icon={IdentificationIcon} color="gold" />
          </div>

          {mainRows.length > 0 && (
            <div className="nayara-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="nayara-table w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left">{ls('CSV Vendor', 'Vendedor CSV')}</th>
                      <th className="px-6 py-4 text-left">{ls('Match in System', 'Coincidencia')}</th>
                      <th className="px-6 py-4 text-center">{ls('Action', 'Accion')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainRows.map((item, index) => {
                      const sourceIndex = results.analysis.indexOf(item);
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black" style={{ color: 'var(--charcoal)' }}>{item.csv.name}</span>
                              <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>
                                {item.csv.email || ls('No email', 'Sin correo')} {item.csv.phone ? `| ${item.csv.phone}` : ''}
                              </span>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {item.csv.legacyId && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold" style={{ background: 'rgba(170,142,103,0.1)', color: 'var(--gold)', borderColor: 'rgba(170,142,103,0.25)' }}>
                                    legacy: {item.csv.legacyId}
                                  </span>
                                )}
                                <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold" style={{ background: 'var(--elevated)', color: 'var(--muted)', borderColor: 'var(--separator)' }}>
                                  {item.csv.type}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.match ? (
                              <div className="flex flex-col opacity-75">
                                <span className="font-bold" style={{ color: 'var(--muted)' }}>{item.match.name}</span>
                                <span className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>
                                  {item.match.legacyId ? `legacy: ${item.match.legacyId}` : `id: ${item.match.id.slice(0, 8)}`}
                                </span>
                              </div>
                            ) : (
                              <span className="italic text-xs" style={{ color: 'var(--muted-dim)' }}>{ls('No match found', 'Sin coincidencia')}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                              item.action === 'CREATE'
                                ? 'nayara-badge nayara-badge-confirmed'
                                : item.action === 'UPDATE'
                                ? 'nayara-badge nayara-badge-pending'
                                : 'nayara-badge nayara-badge-cancelled'
                            }`}>
                              {item.action}
                            </span>
                            <p className="text-[9px] mt-1 uppercase font-bold" style={{ color: 'var(--muted-dim)' }}>{item.reason}</p>
                            {item.action === 'CONFLICT' && (
                              <div className="flex justify-center gap-2 mt-2">
                                <button
                                  onClick={() => setRowAction(sourceIndex, 'UPDATE', 'Conflict resolved manually')}
                                  className="px-2 py-1 text-[10px] font-bold rounded border"
                                  style={{ borderColor: 'rgba(170,142,103,0.3)', color: 'var(--gold)', background: 'rgba(170,142,103,0.08)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(170,142,103,0.15)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(170,142,103,0.08)'}
                                >
                                  {ls('Set Update', 'Actualizar')}
                                </button>
                                <button
                                  onClick={() => setRowAction(sourceIndex, 'CREATE', 'Conflict resolved manually')}
                                  className="px-2 py-1 text-[10px] font-bold rounded border"
                                  style={{ borderColor: 'rgba(78,94,62,0.3)', color: 'var(--sage)', background: 'rgba(78,94,62,0.08)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(78,94,62,0.15)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(78,94,62,0.08)'}
                                >
                                  {ls('Set Create', 'Crear')}
                                </button>
                                <button
                                  onClick={() => setRowAction(sourceIndex, 'SKIP', 'Skipped manually')}
                                  className="px-2 py-1 text-[10px] font-bold rounded border"
                                  style={{ borderColor: 'var(--separator)', color: 'var(--muted-dim)', background: 'var(--elevated)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--separator)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--elevated)'}
                                >
                                  {ls('Skip', 'Omitir')}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {skipRows.length > 0 && (
            <div className="nayara-card overflow-hidden">
              <button
                onClick={() => setExpandedSkip((value) => !value)}
                className="w-full px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: expandedSkip ? '1px solid var(--separator)' : 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}
              >
                <div className="flex items-center gap-3">
                  <ExclamationCircleIcon className="h-5 w-5" style={{ color: 'var(--muted-dim)' }} />
                  <span className="font-bold" style={{ color: 'var(--muted)' }}>
                    {skipRows.length} {ls('rows excluded - click to review', 'filas omitidas - clic para revisar')}
                  </span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedSkip ? 'rotate-180' : ''}`} style={{ color: 'var(--muted-dim)' }} />
              </button>

              {expandedSkip && (
                <div>
                  {skipRows.map(({ item, index }) => (
                    <div key={index} className="px-6 py-4" style={{ borderBottom: '1px solid var(--separator)', background: 'var(--elevated)' }}>
                      <p className="font-bold" style={{ color: 'var(--muted)' }}>{item.csv.name || ls('(empty name)', '(nombre vacio)')}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-dim)' }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center p-6 rounded-2xl shadow-xl sticky bottom-6 text-white" style={{ background: 'var(--sidebar-bg)' }}>
            <div>
              <p className="text-xl font-black">
                {actionableRows.length} {ls('rows ready to import', 'filas listas para importar')}
              </p>
              <p className="text-sm opacity-60">
                {results.summary.create} {ls('create', 'crear')} | {results.summary.update} {ls('update', 'actualizar')}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResults(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="px-6 py-3 rounded-xl font-bold"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}
              >
                {ls('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={executeImport}
                disabled={importing || actionableRows.length === 0}
                className="nayara-btn nayara-btn-primary px-8 py-3 disabled:opacity-50"
              >
                {importing ? ls('Importing...', 'Importando...') : ls('Confirm & Import', 'Confirmar e Importar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={
            message.type === 'success'
              ? { background: 'rgba(78,94,62,0.10)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }
              : { background: 'rgba(236,108,75,0.10)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.2)' }
          }
        >
          <CheckCircleIcon className="h-6 w-6" />
          <span className="font-bold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-xs underline">
            {ls('Dismiss', 'Cerrar')}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'muted' | 'sage' | 'gold' | 'terra';
}) {
  const styles: Record<string, React.CSSProperties> = {
    muted: { background: 'var(--elevated)', color: 'var(--muted)', border: '1px solid var(--separator)' },
    sage: { background: 'rgba(78,94,62,0.08)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' },
    gold: { background: 'rgba(170,142,103,0.08)', color: 'var(--gold)', border: '1px solid rgba(170,142,103,0.2)' },
    terra: { background: 'rgba(236,108,75,0.08)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.2)' },
  };

  return (
    <div className="p-4 rounded-2xl flex items-center gap-4" style={styles[color]}>
      <div className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-2xl font-black leading-none">{value}</p>
      </div>
    </div>
  );
}
