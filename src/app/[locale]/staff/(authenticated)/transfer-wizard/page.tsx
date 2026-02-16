'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {ls('Transfer Import Wizard', 'Asistente de Importación de Traslados')}
          </h1>
          <p className="text-sm text-gray-500">
            {ls('Bulk import transfer records from CSV.', 'Importación masiva de traslados desde CSV.')}
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {!results && !analyzing && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
        >
          <CloudArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors" />
          <p className="text-lg font-bold text-gray-700">
            {ls('Upload Transfer CSV', 'Subir CSV de Traslados')}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {ls('Only .csv files supported', 'Solo archivos .csv soportados')}
          </p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        </div>
      )}

      {/* Spinner */}
      {analyzing && (
        <div className="p-20 text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="font-black text-gray-900 uppercase tracking-widest">
            {ls('Analyzing Transfer Data...', 'Analizando Datos de Traslados...')}
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-in fade-in duration-500">

          {/* Summary Cards — single row of 5 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <SummaryCard
              label={ls('Total Rows', 'Total')}
              value={results.summary.total}
              icon={TableCellsIcon}
              color="gray"
            />
            <SummaryCard
              label={ls('New Transfers', 'Nuevos Traslados')}
              value={results.summary.create}
              icon={UserPlusIcon}
              color="green"
            />
            <SummaryCard
              label={ls('Updates', 'Actualizaciones')}
              value={results.summary.update}
              icon={ArrowPathIcon}
              color="blue"
            />
            <SummaryCard
              label={ls('Invalid Date', 'Fecha Inválida')}
              value={results.summary.invalidDate ?? results.summary.invalid_date ?? 0}
              icon={CalendarIcon}
              color="orange"
            />
            <SummaryCard
              label={ls('Skipped', 'Omitidos')}
              value={results.summary.skip}
              icon={ExclamationCircleIcon}
              color="gray"
            />
          </div>

          {/* Main Table: CREATE and UPDATE rows */}
          {mainTableRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">{ls('Date', 'Fecha')}</th>
                      <th className="px-6 py-4 text-left">{ls('Guest', 'Huésped')}</th>
                      <th className="px-6 py-4 text-left">{ls('Route', 'Ruta')}</th>
                      <th className="px-6 py-4 text-left">{ls('Status', 'Estado')}</th>
                      <th className="px-6 py-4 text-center">{ls('Action', 'Acción')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mainTableRows.map((item: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-800">
                            {item.csv?.parsedDate ? formatDate(item.csv.parsedDate) : ls('—', '—')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-gray-900">
                            {item.csv?.guestName || ls('Unknown Guest', 'Huésped Desconocido')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-700">
                            {item.csv?.origin || ls('—', '—')}
                            <span className="mx-1 text-gray-400">→</span>
                            {item.csv?.destination || ls('—', '—')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.csv?.guest_status ? (
                            <StatusBadge status={item.csv.guest_status} />
                          ) : (
                            <span className="text-gray-300 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                            item.action === 'CREATE'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {item.action === 'CREATE' ? ls('CREATE', 'CREAR') : ls('UPDATE', 'ACTUALIZAR')}
                          </span>
                          {item.reason && (
                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{item.reason}</p>
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
            <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedInvalid(!expandedInvalid)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-orange-50 transition-colors border-b border-orange-100"
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-orange-500" />
                  <span className="font-bold text-orange-700">
                    {invalidDateRows.length} {ls(
                      'rows with invalid dates — click to review and fix',
                      'filas con fechas inválidas — haz clic para revisar y corregir'
                    )}
                  </span>
                  {fixedDatesCount > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-black">
                      {fixedDatesCount} {ls('fixed', 'corregidas')}
                    </span>
                  )}
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-orange-400 transition-transform ${expandedInvalid ? 'rotate-180' : ''}`} />
              </button>

              {expandedInvalid && (
                <div className="divide-y divide-orange-100">
                  {invalidDateRows.map(({ item, index }: { item: any; index: number }) => (
                    <div key={index} className="px-6 py-4 bg-orange-50/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900">
                            {item.csv?.guestName || ls('Unknown Guest', 'Huésped Desconocido')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {item.csv?.origin || '—'}
                          <span className="mx-1 text-gray-400">→</span>
                          {item.csv?.destination || '—'}
                        </p>
                        <p className="text-xs text-orange-600 font-medium">
                          {ls('Raw date in CSV:', 'Fecha en CSV:')}
                          {' '}
                          <code className="bg-orange-100 px-1.5 py-0.5 rounded text-orange-800 font-mono">
                            {item.csv?.rawDate || ls('(empty)', '(vacío)')}
                          </code>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                            {ls('Enter correct date', 'Ingresa la fecha correcta')}
                          </label>
                          <input
                            type="date"
                            value={userDates[index] || ''}
                            onChange={(e) =>
                              setUserDates((prev) => ({ ...prev, [index]: e.target.value }))
                            }
                            className="border border-orange-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                          />
                        </div>
                        {userDates[index] && (
                          <div className="flex items-center gap-1 text-green-700">
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
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedSkip(!expandedSkip)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <ExclamationCircleIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-bold text-gray-700">
                    {skipRows.length} {ls('rows excluded — click to review', 'filas omitidas — haz clic para revisar')}
                  </span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${expandedSkip ? 'rotate-180' : ''}`} />
              </button>

              {expandedSkip && (
                <div className="divide-y divide-gray-100">
                  {skipRows.map(({ item, index }: { item: any; index: number }) => (
                    <div key={index} className="px-6 py-4 bg-gray-50/50 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-gray-700">
                          {item.csv?.guestName || ls('Unknown Guest', 'Huésped Desconocido')}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.csv?.origin || '—'}
                          <span className="mx-1">→</span>
                          {item.csv?.destination || '—'}
                        </p>
                        {item.reason && (
                          <p className="text-xs text-gray-400 mt-1 italic">{item.reason}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 text-[10px] font-black uppercase bg-gray-100 text-gray-500 border border-gray-200 rounded-full flex-shrink-0">
                        {ls('SKIP', 'OMITIR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sticky Action Bar */}
          <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl shadow-xl sticky bottom-6 text-white animate-in slide-in-from-bottom duration-500">
            <div>
              <p className="text-xl font-black">
                {results.summary.create} {ls('will be created', 'serán creados')},{' '}
                {results.summary.update} {ls('updated', 'actualizados')}
                {fixedDatesCount > 0 && (
                  <span className="text-orange-400">
                    , {fixedDatesCount} {ls('fixed dates', 'fechas corregidas')}
                  </span>
                )}
              </p>
              <p className="text-sm opacity-60">
                {skipRows.length} {ls('skipped', 'omitidos')}
                {invalidDateRows.length - fixedDatesCount > 0 && (
                  <span className="text-orange-400 ml-2">
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
                className="px-6 py-3 border border-white/20 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                {ls('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={executeImport}
                disabled={importing || totalWillImport === 0}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
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
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
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
  color: 'gray' | 'green' | 'blue' | 'orange' | 'red' | 'yellow';
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex items-center gap-4 shadow-sm`}>
      <div className="p-2 rounded-xl bg-white/50">
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
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    no_show: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
