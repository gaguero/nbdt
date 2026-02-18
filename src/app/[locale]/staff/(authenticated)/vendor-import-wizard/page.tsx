'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
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
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {ls('Vendor Import Wizard', 'Asistente de Importacion de Vendedores')}
        </h1>
        <p className="text-sm text-gray-500">
          {ls(
            'Upload, review, and import vendors while preserving legacy AppSheet vendor IDs.',
            'Sube, revisa e importa vendedores preservando los IDs legacy de AppSheet.'
          )}
        </p>
      </div>

      {!results && !analyzing && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
        >
          <CloudArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors" />
          <p className="text-lg font-bold text-gray-700">{ls('Upload Vendor CSV', 'Subir CSV de Vendedores')}</p>
          <p className="text-sm text-gray-400 mt-1">{ls('Only .csv files supported', 'Solo archivos .csv soportados')}</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        </div>
      )}

      {analyzing && (
        <div className="p-20 text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="font-black text-gray-900 uppercase tracking-widest">
            {ls('Analyzing Vendor Data...', 'Analizando Datos de Vendedores...')}
          </p>
        </div>
      )}

      {results && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <SummaryCard label={ls('Total Rows', 'Total')} value={results.summary.total} icon={TableCellsIcon} color="gray" />
            <SummaryCard label={ls('Creates', 'Nuevos')} value={results.summary.create} icon={UserPlusIcon} color="green" />
            <SummaryCard label={ls('Updates', 'Actualizaciones')} value={results.summary.update} icon={ArrowPathIcon} color="blue" />
            <SummaryCard label={ls('Conflicts', 'Conflictos')} value={results.summary.conflict} icon={ExclamationCircleIcon} color="red" />
            <SummaryCard label={ls('Legacy IDs', 'IDs Legacy')} value={results.summary.withLegacyId} icon={IdentificationIcon} color="orange" />
          </div>

          {mainRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">{ls('CSV Vendor', 'Vendedor CSV')}</th>
                      <th className="px-6 py-4 text-left">{ls('Match in System', 'Coincidencia')}</th>
                      <th className="px-6 py-4 text-center">{ls('Action', 'Accion')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mainRows.map((item, index) => {
                      const sourceIndex = results.analysis.indexOf(item);
                      return (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-gray-900">{item.csv.name}</span>
                              <span className="text-xs text-gray-500">
                                {item.csv.email || ls('No email', 'Sin correo')} {item.csv.phone ? `| ${item.csv.phone}` : ''}
                              </span>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {item.csv.legacyId && (
                                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                                    legacy: {item.csv.legacyId}
                                  </span>
                                )}
                                <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 font-bold">
                                  {item.csv.type}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.match ? (
                              <div className="flex flex-col opacity-75">
                                <span className="font-bold text-gray-700">{item.match.name}</span>
                                <span className="text-[10px] text-gray-400">
                                  {item.match.legacyId ? `legacy: ${item.match.legacyId}` : `id: ${item.match.id.slice(0, 8)}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 italic text-xs">{ls('No match found', 'Sin coincidencia')}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                                item.action === 'CREATE'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : item.action === 'UPDATE'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {item.action}
                            </span>
                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{item.reason}</p>
                            {item.action === 'CONFLICT' && (
                              <div className="flex justify-center gap-2 mt-2">
                                <button
                                  onClick={() => setRowAction(sourceIndex, 'UPDATE', 'Conflict resolved manually')}
                                  className="px-2 py-1 text-[10px] font-bold rounded border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                >
                                  {ls('Set Update', 'Actualizar')}
                                </button>
                                <button
                                  onClick={() => setRowAction(sourceIndex, 'CREATE', 'Conflict resolved manually')}
                                  className="px-2 py-1 text-[10px] font-bold rounded border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                                >
                                  {ls('Set Create', 'Crear')}
                                </button>
                                <button
                                  onClick={() => setRowAction(sourceIndex, 'SKIP', 'Skipped manually')}
                                  className="px-2 py-1 text-[10px] font-bold rounded border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
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
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedSkip((value) => !value)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <ExclamationCircleIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-bold text-gray-700">
                    {skipRows.length} {ls('rows excluded - click to review', 'filas omitidas - clic para revisar')}
                  </span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${expandedSkip ? 'rotate-180' : ''}`} />
              </button>

              {expandedSkip && (
                <div className="divide-y divide-gray-100">
                  {skipRows.map(({ item, index }) => (
                    <div key={index} className="px-6 py-4 bg-gray-50/50">
                      <p className="font-bold text-gray-700">{item.csv.name || ls('(empty name)', '(nombre vacio)')}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl shadow-xl sticky bottom-6 text-white">
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
                className="px-6 py-3 border border-white/20 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                {ls('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={executeImport}
                disabled={importing || actionableRows.length === 0}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {importing ? ls('Importing...', 'Importando...') : ls('Confirm & Import', 'Confirmar e Importar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
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
  color: 'gray' | 'green' | 'blue' | 'red' | 'orange';
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
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
