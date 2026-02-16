'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  TableCellsIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export default function ImportWizardPage() {
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [importing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedSkip, setExpandedSkip] = useState(false);
  const [rescuedRows, setRescuedRows] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setAnalyzing(true);
    setResults(null);
    setRescuedRows(new Set());

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await fetch('/api/admin/import-analysis', {
        method: 'POST',
        body: formData
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

  const rescueRow = (index: number, profileType: string) => {
    const newRescued = new Set(rescuedRows);
    newRescued.add(index);
    setRescuedRows(newRescued);

    // Update the analysis row action and profileType
    const updatedAnalysis = results.analysis.map((item: any, i: number) => {
      if (i === index) {
        return {
          ...item,
          action: 'CREATE',
          reason: `Rescued as ${profileType}`,
          inferredProfileType: profileType
        };
      }
      return item;
    });

    const updatedSummary = {
      total: results.summary.total,
      create: updatedAnalysis.filter((a: any) => a.action === 'CREATE').length,
      update: updatedAnalysis.filter((a: any) => a.action === 'UPDATE').length,
      conflict: updatedAnalysis.filter((a: any) => a.action === 'CONFLICT').length,
      skip: updatedAnalysis.filter((a: any) => a.action === 'SKIP').length
    };

    setResults({
      ...results,
      analysis: updatedAnalysis,
      summary: updatedSummary
    });
  };

  const executeImport = async () => {
    const rowsToImport = results.analysis.filter((item: any) => item.action === 'CREATE' || item.action === 'UPDATE');
    if (!confirm(ls(
      `Proceed with importing ${rowsToImport.length} guests?`,
      `¿Proceder con la importación de ${rowsToImport.length} huéspedes?`
    ))) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/import-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: ls(
            `Import complete: ${data.result.created} created, ${data.result.updated} updated.`,
            `Importación completada: ${data.result.created} creados, ${data.result.updated} actualizados.`
          )
        });
        setResults(null);
        setFile(null);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const skipRows = results?.analysis.filter((item: any) => item.action === 'SKIP') || [];
  const mainTableRows = results?.analysis.filter((item: any) => item.action !== 'SKIP') || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{ls('Guest Import Wizard', 'Asistente de Importación')}</h1>
          <p className="text-sm text-gray-500">{ls('Advanced CRM-ready guest data ingestion.', 'Ingestión avanzada de datos de huéspedes lista para CRM.')}</p>
        </div>
      </div>

      {!results && !analyzing && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
        >
          <CloudArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors" />
          <p className="text-lg font-bold text-gray-700">{ls('Upload Guest CSV', 'Subir CSV de Huéspedes')}</p>
          <p className="text-sm text-gray-400 mt-1">{ls('Only .csv files supported', 'Solo archivos .csv soportados')}</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
        </div>
      )}

      {analyzing && (
        <div className="p-20 text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="font-black text-gray-900 uppercase tracking-widest">{ls('Analyzing Data Structure...', 'Analizando Datos...')}</p>
        </div>
      )}

      {results && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard label={ls('Total Rows', 'Total')} value={results.summary.total} icon={TableCellsIcon} color="gray" />
            <SummaryCard label={ls('New Profiles', 'Nuevos')} value={results.summary.create} icon={UserPlusIcon} color="green" />
            <SummaryCard label={ls('Updates', 'Actualizaciones')} value={results.summary.update} icon={ArrowPathIcon} color="blue" />
            <SummaryCard label={ls('Conflicts', 'Conflictos')} value={results.summary.conflict} icon={ExclamationCircleIcon} color="red" />
          </div>


          {/* Main Table */}
          {mainTableRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">{ls('CSV Record', 'Registro CSV')}</th>
                      <th className="px-6 py-4 text-left">{ls('Match in System', 'Coincidencia')}</th>
                      <th className="px-6 py-4 text-center">{ls('Action', 'Acción')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mainTableRows.map((item: any, i: number) => (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900">{item.csv.fullName}</span>
                              {item.inferredProfileType && item.inferredProfileType !== 'guest' && (
                                <ProfileTypeBadge type={item.inferredProfileType} />
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{item.csv.email || ls('No email', 'Sin email')}</span>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {item.csv.companion && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                                  item.multiCompanion ? 'bg-orange-50 text-orange-700 border-orange-100 ring-1 ring-orange-300' : 'bg-purple-50 text-purple-700 border-purple-100'
                                }`}>
                                  + {item.csv.companion} {item.multiCompanion && '⚠'}
                                </span>
                              )}
                              {item.csv.vip > 0 && (
                                <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-black tracking-tighter">
                                  VIP {item.csv.vip}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.match ? (
                            <div className="flex flex-col opacity-70">
                              <span className="font-bold text-gray-700">{item.match.fullName}</span>
                              <span className="text-[10px] text-gray-400">ID: {item.match.legacyId || item.match.id.slice(0, 8)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 italic text-xs">{ls('No match found', 'Sin coincidencia')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                            item.action === 'CREATE' ? 'bg-green-50 text-green-700 border-green-200' :
                            item.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            item.action === 'CONFLICT' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {item.action}
                          </span>
                          <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{item.reason}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skipped Rows Collapsible Section */}
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
                  {skipRows.map((item: any, i: number) => (
                    <div key={i} className="px-6 py-4 bg-gray-50/50 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-gray-700">{item.csv.fullName}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <RescueDropdown
                          onRescue={(type) => rescueRow(
                            results.analysis.indexOf(item),
                            type
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl shadow-xl sticky bottom-6 text-white animate-in slide-in-from-bottom duration-500">
            <div>
              <p className="text-xl font-black">
                {results.summary.create} {ls('will be created', 'serán creados')}, {results.summary.update} {ls('updated', 'actualizados')}
              </p>
              <p className="text-sm opacity-60">
                {results.summary.skip} {ls('skipped', 'omitidos')}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setResults(null)}
                className="px-6 py-3 border border-white/20 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                {ls('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={executeImport}
                disabled={importing || (results.summary.create + results.summary.update) === 0}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {importing ? ls('Importing...', 'Importando...') : ls('Confirm & Import', 'Confirmar e Importar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <CheckCircleIcon className="h-6 w-6" />
          <span className="font-bold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-xs underline">{ls('Dismiss', 'Cerrar')}</button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex items-center gap-4 shadow-sm`}>
      <div className={`p-2 rounded-xl bg-white/50`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-2xl font-black leading-none">{value}</p>
      </div>
    </div>
  );
}

function ProfileTypeBadge({ type }: { type: string }) {
  const styles: any = {
    staff: 'bg-purple-100 text-purple-700 border-purple-200',
    visitor: 'bg-teal-100 text-teal-700 border-teal-200',
    musician: 'bg-pink-100 text-pink-700 border-pink-200',
    artist: 'bg-amber-100 text-amber-700 border-amber-200',
    other: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`text-[9px] px-2 py-1 rounded border font-bold uppercase ${styles[type] || styles.other}`}>
      {type}
    </span>
  );
}

function RescueDropdown({ onRescue }: { onRescue: (type: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
      >
        Rescue
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            onClick={() => {
              onRescue('guest');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 border-b border-gray-100"
          >
            Create as Guest
          </button>
          <button
            onClick={() => {
              onRescue('staff');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 border-b border-gray-100"
          >
            Create as Staff
          </button>
          <button
            onClick={() => {
              onRescue('visitor');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 border-b border-gray-100"
          >
            Create as Visitor
          </button>
          <button
            onClick={() => {
              onRescue('other');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
          >
            Create as Other
          </button>
        </div>
      )}
    </div>
  );
}
