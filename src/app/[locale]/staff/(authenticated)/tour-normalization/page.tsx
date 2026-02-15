'use client';

import { useRef, useState } from 'react';

interface TourProduct {
  id: string;
  name_en: string;
  name_es: string;
  vendor_name: string;
}

interface MatchResult {
  type: 'exact' | 'fuzzy' | 'none';
  product: TourProduct | null;
  rowCount: number;
}

type MappingDecision =
  | { action: 'map'; productId: string }
  | { action: 'create'; name_en: string; name_es: string }
  | { action: 'skip' };

type Step = 'upload' | 'review' | 'importing' | 'done';

export default function TourNormalizationPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [matches, setMatches] = useState<Record<string, MatchResult>>({});
  const [products, setProducts] = useState<TourProduct[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, MappingDecision>>({});
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number; updated: number; skipped: number; errors: string[];
  } | null>(null);

  async function handleParse() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setParsing(true);
    setParseError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/tour-normalization/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error); return; }

      setMatches(data.matches);
      setProducts(data.products);
      setTotalRows(data.totalRows);

      // Auto-decide for exact matches
      const auto: Record<string, MappingDecision> = {};
      for (const [name, match] of Object.entries(data.matches as Record<string, MatchResult>)) {
        if (match.type === 'exact' && match.product) {
          auto[name] = { action: 'map', productId: match.product.id };
        } else if (match.type === 'fuzzy' && match.product) {
          auto[name] = { action: 'map', productId: match.product.id };
        } else {
          auto[name] = { action: 'skip' };
        }
      }
      setDecisions(auto);
      setStep('review');
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!csvFile) return;
    setStep('importing');

    // Convert decisions to API format
    const mappings: Record<string, { productId?: string; create?: boolean; name_en?: string; name_es?: string; skip?: boolean }> = {};
    for (const [name, dec] of Object.entries(decisions)) {
      if (dec.action === 'map') mappings[name] = { productId: dec.productId };
      else if (dec.action === 'create') mappings[name] = { create: true, name_en: dec.name_en, name_es: dec.name_es };
      else mappings[name] = { skip: true };
    }

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('mappings', JSON.stringify(mappings));

    try {
      const res = await fetch('/api/admin/tour-normalization/execute', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data.result);
      } else {
        setImportResult({ created: 0, updated: 0, skipped: 0, errors: [data.error] });
      }
    } catch (err: any) {
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [err.message] });
    } finally {
      setStep('done');
    }
  }

  function setDecision(name: string, dec: MappingDecision) {
    setDecisions(prev => ({ ...prev, [name]: dec }));
  }

  const matchEntries = Object.entries(matches);
  const exactCount = matchEntries.filter(([, m]) => m.type === 'exact').length;
  const fuzzyCount = matchEntries.filter(([, m]) => m.type === 'fuzzy').length;
  const noneCount = matchEntries.filter(([, m]) => m.type === 'none').length;
  const mappedCount = Object.values(decisions).filter(d => d.action !== 'skip').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tour Bookings Import</h1>
        <p className="text-sm text-gray-500">
          Upload your tour bookings CSV, review matches, then import all records.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'review', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-blue-600 text-white' :
              (step === 'review' && s === 'upload') || step === 'done' ? 'bg-green-500 text-white' :
              step === 'importing' && s !== 'done' ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>{i + 1}</span>
            <span className={step === s ? 'font-medium text-gray-900' : 'text-gray-400'}>
              {s === 'upload' ? 'Upload CSV' : s === 'review' ? 'Review Matches' : 'Import'}
            </span>
            {i < 2 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center space-y-4">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-base font-medium text-gray-700">Upload Tour Bookings CSV</p>
            <p className="text-sm text-gray-500 mt-1">
              Must contain a &quot;Nombre de la actividad&quot; column with tour names
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full max-w-xs mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {parseError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{parseError}</p>
          )}
          <button
            onClick={handleParse}
            disabled={parsing}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {parsing ? 'Analyzing CSV…' : 'Analyze CSV →'}
          </button>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{exactCount}</p>
              <p className="text-sm text-green-600">Exact matches</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{fuzzyCount}</p>
              <p className="text-sm text-yellow-600">Fuzzy matches (review)</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{noneCount}</p>
              <p className="text-sm text-red-600">No match — action required</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CSV Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rows</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matchEntries.map(([name, match]) => {
                  const decision = decisions[name] || { action: 'skip' };
                  return (
                    <tr key={name} className={
                      decision.action === 'map' ? 'bg-green-50/40' :
                      decision.action === 'create' ? 'bg-blue-50/40' : ''
                    }>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{match.rowCount}</td>
                      <td className="px-4 py-3 text-sm">
                        {match.type === 'exact' && (
                          <span className="text-green-700 font-medium">{match.product!.name_en}</span>
                        )}
                        {match.type === 'fuzzy' && (
                          <span className="text-yellow-700">{match.product!.name_en} <span className="text-xs">(fuzzy)</span></span>
                        )}
                        {match.type === 'none' && (
                          <span className="text-red-500 text-xs italic">No match found</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1.5">
                          {/* Map to existing product */}
                          <select
                            value={decision.action === 'map' ? decision.productId : ''}
                            onChange={e => {
                              if (e.target.value) setDecision(name, { action: 'map', productId: e.target.value });
                              else setDecision(name, { action: 'skip' });
                            }}
                            className="block w-full rounded border-gray-300 text-sm py-1 px-2 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">— Skip / Select product —</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name_en}{p.vendor_name ? ` (${p.vendor_name})` : ''}
                              </option>
                            ))}
                          </select>

                          {/* Create new product option */}
                          {decision.action === 'create' ? (
                            <div className="flex gap-1">
                              <input
                                placeholder="English name"
                                value={decision.name_en}
                                onChange={e => setDecision(name, { action: 'create', name_en: e.target.value, name_es: decision.name_es })}
                                className="flex-1 rounded border-gray-300 text-sm py-1 px-2"
                              />
                              <input
                                placeholder="Spanish name"
                                value={decision.name_es}
                                onChange={e => setDecision(name, { action: 'create', name_en: decision.name_en, name_es: e.target.value })}
                                className="flex-1 rounded border-gray-300 text-sm py-1 px-2"
                              />
                              <button
                                onClick={() => setDecision(name, { action: 'skip' })}
                                className="text-gray-400 hover:text-red-500 text-xs px-1"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDecision(name, { action: 'create', name_en: name, name_es: name })}
                              className="text-xs text-blue-600 hover:text-blue-800 text-left"
                            >
                              + Create as new tour product
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {mappedCount} of {matchEntries.length} names will be imported ({totalRows} total rows)
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('upload'); setCsvFile(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleImport}
                disabled={mappedCount === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Import {mappedCount > 0 ? `${matchEntries.reduce((sum, [n]) => sum + (decisions[n]?.action !== 'skip' ? matches[n].rowCount : 0), 0)} rows` : 'All'} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Importing tour bookings…</p>
          <p className="text-sm text-gray-500 mt-1">Creating new products and saving bookings</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && importResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Import Complete</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
              <p className="text-sm text-green-600">New bookings</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
              <p className="text-sm text-blue-600">Updated</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-700">{importResult.skipped}</p>
              <p className="text-sm text-gray-600">Skipped</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-2">{importResult.errors.length} errors:</p>
              <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <button
            onClick={() => { setStep('upload'); setCsvFile(null); setImportResult(null); setMatches({}); setDecisions({}); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
