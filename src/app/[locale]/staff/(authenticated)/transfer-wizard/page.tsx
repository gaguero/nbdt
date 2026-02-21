'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { DataCurationNav } from '@/components/staff/DataCurationNav';
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TableCellsIcon,
  ArrowPathIcon,
  UserPlusIcon,
  CalendarIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

export default function TransferWizardPage() {
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedInvalid, setExpandedInvalid] = useState(false);
  const [expandedSkip, setExpandedSkip] = useState(false);
  const [userDates, setUserDates] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setAnalyzing(true);
    setResults(null);
    setUserDates({});
    setExpandedInvalid(false);
    setExpandedSkip(false);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await fetch('/api/admin/transfer-analysis', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const executeImport = async () => {
    const createRows = results.analysis.filter((item: any) => item.action === 'CREATE');
    const updateRows = results.analysis.filter((item: any) => item.action === 'UPDATE');
    const fixedInvalidRows = results.analysis
      .map((item: any, index: number) => ({ item, index }))
      .filter(({ item, index }: { item: any; index: number }) =>
        item.action === 'INVALID_DATE' && userDates[index]
      )
      .map(({ item, index }: { item: any; index: number }) => ({
        ...item,
        userDate: userDates[index],
      }));

    const rowsToImport = [...createRows, ...updateRows, ...fixedInvalidRows];

    if (rowsToImport.length === 0) {
      setMessage({ type: 'error', text: ls('No rows to import.', 'No hay filas para importar.') });
      return;
    }

    if (!confirm(ls(
      `Proceed with importing ${rowsToImport.length} transfers?`,
      `¿Proceder con la importación de ${rowsToImport.length} traslados?`
    ))) return;

    setImporting(true);
    try {
      const res = await fetch('/api/admin/transfer-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: ls(
            `Import complete: ${data.result.created} created, ${data.result.updated} updated.`,
            `Importación completada: ${data.result.created} creados, ${data.result.updated} actualizados.`
          ),
        });
        setResults(null);
        setFile(null);
        setUserDates({});
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  const mainTableRows = results?.analysis.filter(
    (item: any) => item.action === 'CREATE' || item.action === 'UPDATE'
  ) || [];

  const invalidDateRows = results?.analysis
    .map((item: any, index: number) => ({ item, index }))
    .filter(({ item }: { item: any }) => item.action === 'INVALID_DATE') || [];

  const skipRows = results?.analysis
    .map((item: any, index: number) => ({ item, index }))
    .filter(({ item }: { item: any }) => item.action === 'SKIP') || [];

  const fixedDatesCount = invalidDateRows.filter(
    ({ index }: { index: number }) => userDates[index]
  ).length;

  const totalWillImport =
    (results?.summary.create ?? 0) +
    (results?.summary.update ?? 0) +
    fixedDatesCount;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ls('Unknown date', 'Fecha desconocida');
    try {
      return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-PA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <DataCurationNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>
            {ls('Transfer Import Wizard', 'Asistente de Importación de Traslados')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>
            {ls('Bulk import transfer records from CSV.', 'Importación masiva de traslados desde CSV.')}
          </p>
        </div>
      </div>

      {/* Upload Zone */}
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
          <p className="text-lg font-bold" style={{ color: 'var(--muted)' }}>
            {ls('Upload Transfer CSV', 'Subir CSV de Traslados')}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>
            {ls('Only .csv files supported', 'Solo archivos .csv soportados')}
          </p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        </div>
      )}

      {/* Spinner */}
      {analyzing && (
        <div className="p-20 text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}></div>
          <p className="font-black uppercase tracking-widest" style={{ color: 'var(--charcoal)' }}>
            {ls('Analyzing Transfer Data...', 'Analizando Datos de Traslados...')}
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-in fade-in duration-500">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <SummaryCard label={ls('Total Rows', 'Total')} value={results.summary.total} icon={TableCellsIcon} color="muted" />
            <SummaryCard label={ls('New Transfers', 'Nuevos Traslados')} value={results.summary.create} icon={UserPlusIcon} color="sage" />
            <SummaryCard label={ls('Updates', 'Actualizaciones')} value={results.summary.update} icon={ArrowPathIcon} color="gold" />
            <SummaryCard label={ls('Invalid Date', 'Fecha Inválida')} value={results.summary.invalidDate ?? results.summary.invalid_date ?? 0} icon={CalendarIcon} color="terra" />
            <SummaryCard label={ls('Skipped', 'Omitidos')} value={results.summary.skip} icon={ExclamationCircleIcon} color="muted" />
          </div>

          {/* Main Table: CREATE and UPDATE rows */}
          {mainTableRows.length > 0 && (
            <div className="nayara-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="nayara-table w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left">{ls('Date', 'Fecha')}</th>
                      <th className="px-6 py-4 text-left">{ls('Guest', 'Huésped')}</th>
                      <th className="px-6 py-4 text-left">{ls('Route', 'Ruta')}</th>
                      <th className="px-6 py-4 text-left">{ls('Status', 'Estado')}</th>
                      <th className="px-6 py-4 text-center">{ls('Action', 'Acción')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainTableRows.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium" style={{ color: 'var(--charcoal)' }}>
                            {item.csv?.parsedDate ? formatDate(item.csv.parsedDate) : ls('—', '—')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black" style={{ color: 'var(--charcoal)' }}>
                            {item.guest?.fullName || item.csv?.guestName || ls('Unknown Guest', 'Huésped Desconocido')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span style={{ color: 'var(--muted)' }}>
                            {item.csv?.origin || ls('—', '—')}
                            <span className="mx-1" style={{ color: 'var(--muted-dim)' }}>→</span>
                            {item.csv?.destination || ls('—', '—')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.csv?.guest_status ? (
                            <StatusBadge status={item.csv.guest_status} />
                          ) : (
                            <span className="italic text-xs" style={{ color: 'var(--muted-dim)' }}>—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                            item.action === 'CREATE'
                              ? 'nayara-badge nayara-badge-confirmed'
                              : 'nayara-badge nayara-badge-pending'
                          }`}>
                            {item.action === 'CREATE' ? ls('CREATE', 'CREAR') : ls('UPDATE', 'ACTUALIZAR')}
                          </span>
                          {item.reason && (
                            <p className="text-[9px] mt-1 uppercase font-bold" style={{ color: 'var(--muted-dim)' }}>{item.reason}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVALID_DATE Collapsible Section */}
          {invalidDateRows.length > 0 && (
            <div className="nayara-card overflow-hidden" style={{ borderColor: 'rgba(236,108,75,0.3)' }}>
              <button
                onClick={() => setExpandedInvalid(!expandedInvalid)}
                className="w-full px-6 py-4 flex items-center justify-between"
                style={{
                  borderBottom: expandedInvalid ? '1px solid rgba(236,108,75,0.2)' : 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(236,108,75,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5" style={{ color: 'var(--terra)' }} />
                  <span className="font-bold" style={{ color: 'var(--terra)' }}>
                    {invalidDateRows.length} {ls(
                      'rows with invalid dates — click to review and fix',
                      'filas con fechas inválidas — haz clic para revisar y corregir'
                    )}
                  </span>
                  {fixedDatesCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(78,94,62,0.1)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }}>
                      {fixedDatesCount} {ls('fixed', 'corregidas')}
                    </span>
                  )}
                </div>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedInvalid ? 'rotate-180' : ''}`} style={{ color: 'var(--terra)' }} />
              </button>

              {expandedInvalid && (
                <div>
                  {invalidDateRows.map(({ item, index }: { item: any; index: number }) => (
                    <div key={index} className="px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid rgba(236,108,75,0.1)', background: 'rgba(236,108,75,0.03)' }}>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black" style={{ color: 'var(--charcoal)' }}>
                            {item.guest?.fullName || item.csv?.guestName || ls('Unknown Guest', 'Huésped Desconocido')}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {item.csv?.origin || '—'}
                          <span className="mx-1" style={{ color: 'var(--muted-dim)' }}>→</span>
                          {item.csv?.destination || '—'}
                        </p>
                        <p className="text-xs font-medium" style={{ color: 'var(--terra)' }}>
                          {ls('Raw date in CSV:', 'Fecha en CSV:')}
                          {' '}
                          <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(236,108,75,0.1)', color: 'var(--terra)' }}>
                            {item.csv?.rawDate || ls('(empty)', '(vacío)')}
                          </code>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <label className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--muted-dim)' }}>
                            {ls('Enter correct date', 'Ingresa la fecha correcta')}
                          </label>
                          <input
                            type="date"
                            value={userDates[index] || ''}
                            onChange={(e) =>
                              setUserDates((prev) => ({ ...prev, [index]: e.target.value }))
                            }
                            className="nayara-input px-3 py-1.5 text-sm"
                            style={{ borderColor: 'rgba(236,108,75,0.4)' }}
                          />
                        </div>
                        {userDates[index] && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--sage)' }}>
                            <CheckCircleIcon className="h-5 w-5" />
                            <span className="text-xs font-bold">{ls('Will import', 'Se importará')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SKIP Collapsible Section */}
          {skipRows.length > 0 && (
            <div className="nayara-card overflow-hidden">
              <button
                onClick={() => setExpandedSkip(!expandedSkip)}
                className="w-full px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: expandedSkip ? '1px solid var(--separator)' : 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}
              >
                <div className="flex items-center gap-3">
                  <ExclamationCircleIcon className="h-5 w-5" style={{ color: 'var(--muted-dim)' }} />
                  <span className="font-bold" style={{ color: 'var(--muted)' }}>
                    {skipRows.length} {ls('rows excluded — click to review', 'filas omitidas — haz clic para revisar')}
                  </span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedSkip ? 'rotate-180' : ''}`} style={{ color: 'var(--muted-dim)' }} />
              </button>

              {expandedSkip && (
                <div>
                  {skipRows.map(({ item, index }: { item: any; index: number }) => (
                    <div key={index} className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--separator)', background: 'var(--elevated)' }}>
                      <div className="flex-1">
                        <p className="font-bold" style={{ color: 'var(--muted)' }}>
                          {item.guest?.fullName || item.csv?.guestName || ls('Unknown Guest', 'Huésped Desconocido')}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                          {item.csv?.origin || '—'}
                          <span className="mx-1">→</span>
                          {item.csv?.destination || '—'}
                        </p>
                        {item.reason && (
                          <p className="text-xs mt-1 italic" style={{ color: 'var(--muted-dim)' }}>{item.reason}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 text-[10px] font-black uppercase rounded-full flex-shrink-0" style={{ background: 'var(--elevated)', color: 'var(--muted-dim)', border: '1px solid var(--separator)' }}>
                        {ls('SKIP', 'OMITIR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sticky Action Bar */}
          <div className="flex justify-between items-center p-6 rounded-2xl shadow-xl sticky bottom-6 text-white animate-in slide-in-from-bottom duration-500" style={{ background: 'var(--sidebar-bg)' }}>
            <div>
              <p className="text-xl font-black">
                {results.summary.create} {ls('will be created', 'serán creados')},{' '}
                {results.summary.update} {ls('updated', 'actualizados')}
                {fixedDatesCount > 0 && (
                  <span style={{ color: 'var(--gold)' }}>
                    , {fixedDatesCount} {ls('fixed dates', 'fechas corregidas')}
                  </span>
                )}
              </p>
              <p className="text-sm opacity-60">
                {skipRows.length} {ls('skipped', 'omitidos')}
                {invalidDateRows.length - fixedDatesCount > 0 && (
                  <span className="ml-2" style={{ color: 'var(--gold)' }}>
                    · {invalidDateRows.length - fixedDatesCount} {ls('invalid dates remaining', 'fechas inválidas pendientes')}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResults(null);
                  setFile(null);
                  setUserDates({});
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
                disabled={importing || totalWillImport === 0}
                className="nayara-btn nayara-btn-primary px-8 py-3 disabled:opacity-50"
              >
                {importing
                  ? ls('Importing...', 'Importando...')
                  : ls('Confirm & Import', 'Confirmar e Importar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message banner */}
      {message && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={
          message.type === 'success'
            ? { background: 'rgba(78,94,62,0.10)', color: 'var(--sage)', border: '1px solid rgba(78,94,62,0.2)' }
            : { background: 'rgba(236,108,75,0.10)', color: 'var(--terra)', border: '1px solid rgba(236,108,75,0.2)' }
        }>
          <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
          <span className="font-bold">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-xs underline"
          >
            {ls('Dismiss', 'Cerrar')}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: {
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

function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    pending: 'nayara-badge nayara-badge-pending',
    confirmed: 'nayara-badge nayara-badge-confirmed',
    completed: 'nayara-badge nayara-badge-confirmed',
    cancelled: 'nayara-badge nayara-badge-cancelled',
    no_show: 'nayara-badge',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${classMap[status] ?? 'nayara-badge'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
