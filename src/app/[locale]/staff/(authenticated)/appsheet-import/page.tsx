'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { DataCurationNav } from '@/components/staff/DataCurationNav';
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TableCellsIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { APPSHEET_TABLES } from '@/types/appsheet';
import type { AppSheetTable } from '@/types/appsheet';

export default function AppSheetImportPage() {
  const locale = useLocale();
  const [table, setTable] = useState<AppSheetTable>('guests');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file || !table) return;

    setImporting(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('table', table);

    try {
      const res = await fetch('/api/appsheet/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <DataCurationNav />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {ls('AppSheet Legacy Import', 'Importación Legacy AppSheet')}
          </h1>
          <p className="text-sm text-gray-500">
            {ls('Directly ingest CSV exports from legacy AppSheet tables.', 'Ingesta directa de exportaciones CSV de tablas legacy de AppSheet.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selection & Upload */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                {ls('Target Table', 'Tabla Destino')}
              </label>
              <select
                value={table}
                onChange={(e) => setTable(e.target.value as AppSheetTable)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {APPSHEET_TABLES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                {ls('CSV File', 'Archivo CSV')}
              </label>
              <div 
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                <p className="text-xs font-bold text-gray-600">
                  {file ? file.name : ls('Click to upload', 'Haz clic para subir')}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full bg-gray-900 text-white rounded-xl py-3 font-black text-sm hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  {ls('Importing...', 'Importando...')}
                </>
              ) : (
                ls('Run Import', 'Ejecutar Importación')
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="md:col-span-2">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800 animate-in fade-in slide-in-from-top-4">
              <ExclamationCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">{ls('Import Error', 'Error de Importación')}</p>
                <p className="text-xs opacity-80">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ResultCard label={ls('Total', 'Total')} value={result.total} icon={TableCellsIcon} color="gray" />
                <ResultCard label={ls('Created', 'Creados')} value={result.created} icon={CheckCircleIcon} color="green" />
                <ResultCard label={ls('Updated', 'Actualizados')} value={result.updated} icon={ArrowPathIcon} color="blue" />
                <ResultCard label={ls('Unchanged', 'Sin cambios')} value={result.unchanged} icon={CheckCircleIcon} color="gray" />
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {ls('Warnings & Errors', 'Advertencias y Errores')} ({result.errors.length})
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-4 space-y-1">
                    {result.errors.map((err: string, i: number) => (
                      <p key={i} className="text-xs text-red-600 font-mono">
                        • {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-800">
                <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
                <p className="font-bold text-sm">
                  {ls('Import process completed successfully.', 'Proceso de importación completado con éxito.')}
                </p>
              </div>
            </div>
          )}

          {!result && !error && !importing && (
            <div className="h-full border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-gray-300">
              <TableCellsIcon className="h-12 w-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">
                {ls('Awaiting Data Import', 'Esperando Importación')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 opacity-50" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
      </div>
      <p className="text-2xl font-black leading-none">{value}</p>
    </div>
  );
}
