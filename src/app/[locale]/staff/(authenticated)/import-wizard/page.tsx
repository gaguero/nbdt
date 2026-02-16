'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  UserPlusIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

export default function ImportWizardPage() {
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [importing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setAnalyzing(true);
    setResults(null);

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

  const executeImport = async () => {
    if (!confirm(ls(`Proceed with importing ${results.analysis.length} guests?`, `¿Proceder con la importación de ${results.analysis.length} huéspedes?`))) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/import-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: results.analysis })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: ls(`Import complete: ${data.result.created} created, ${data.result.updated} updated.`, `Importación completada: ${data.result.created} creados, ${data.result.updated} actualizados.`) 
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
                  {results.analysis.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900">{item.csv.fullName}</span>
                          <span className="text-xs text-gray-500">{item.csv.email || ls('No email', 'Sin email')}</span>
                          <div className="flex gap-2 mt-1">
                            {item.csv.companion && (
                              <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-bold uppercase">
                                + {item.csv.companion}
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
                            <span className="text-[10px] text-gray-400">ID: {item.match.legacyId || item.match.id.slice(0,8)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic text-xs">{ls('No match found', 'Sin coincidencia')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                          item.action === 'CREATE' ? 'bg-green-50 text-green-700 border-green-200' :
                          item.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
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

          <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl shadow-xl sticky bottom-6 text-white animate-in slide-in-from-bottom duration-500">
            <div>
              <p className="text-xl font-black">{ls('Ready to ingest', 'Listo para procesar')}</p>
              <p className="text-sm opacity-60">{results.summary.total} {ls('profiles analyzed', 'perfiles analizados')}</p>
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
                disabled={importing}
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
