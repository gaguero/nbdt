'use client';

import { useRef, useState } from 'react';

interface UniqueNameEntry { name: string; count: number; }
interface TourProduct { id: string; name_en: string; name_es: string; vendor_name: string; }
interface Vendor { id: string; name: string; type: string; }

interface ParsedGroup {
  groupId: number;
  csvNames: string[];
  rowCount: number;
  suggestedAction: 'create' | 'map' | 'skip';
  suggestedProductId?: string;
  suggestedNameEn?: string;
  suggestedNameEs?: string;
}

interface GroupDecision {
  action: 'create' | 'map' | 'skip';
  productId?: string;
  name_en?: string;
  name_es?: string;
  vendor_id?: string;
}

type Step = 'upload' | 'parsing' | 'paste' | 'review' | 'importing' | 'done';

const VENDOR_TYPE_COLORS: Record<string, string> = {
  transfer: 'text-blue-600',
  tour: 'text-green-600',
  spa: 'text-purple-600',
  restaurant: 'text-orange-600',
  other: 'text-gray-500',
};

export default function TourNormalizationPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('upload');

  // After parse
  const [prompt, setPrompt] = useState('');
  const [uniqueNames, setUniqueNames] = useState<UniqueNameEntry[]>([]);
  const [nameCountMap, setNameCountMap] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<TourProduct[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Paste step
  const [pastedResponse, setPastedResponse] = useState('');
  const [copied, setCopied] = useState(false);

  // Review step
  const [groups, setGroups] = useState<ParsedGroup[]>([]);
  const [decisions, setDecisions] = useState<Record<number, GroupDecision>>({});

  // Results
  const [importResult, setImportResult] = useState<{
    created: number; updated: number; skipped: number; errors: string[];
  } | null>(null);

  // Errors
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiParseError, setAiParseError] = useState<string | null>(null);

  // ── Step 1: upload & parse CSV ──────────────────────────────────────────────

  async function handleParse() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setStep('parsing');
    setParseError(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/admin/tour-normalization/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error); setStep('upload'); return; }

      setPrompt(data.prompt);
      setUniqueNames(data.uniqueNames);
      setNameCountMap(data.nameCountMap);
      setProducts(data.products);
      setVendors(data.vendors);
      setTotalRows(data.totalRows);
      setStep('paste');
    } catch (err: any) {
      setParseError(err.message);
      setStep('upload');
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Step 2: parse AI response ───────────────────────────────────────────────

  function handleParseAIResponse() {
    setAiParseError(null);
    const text = pastedResponse.trim();
    if (!text) { setAiParseError('Please paste the AI response first.'); return; }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      setAiParseError('No JSON array found. Make sure you copied the complete AI reply.');
      return;
    }

    let rawGroups: { groupId: number; csvNames: string[]; action: string; productId?: string; name_en?: string; name_es?: string }[];
    try {
      rawGroups = JSON.parse(jsonMatch[0]);
    } catch (_e) {
      setAiParseError('Invalid JSON. Ask the AI to return only the JSON array with no extra text.');
      return;
    }

    const allCsvNames = new Set(uniqueNames.map(n => n.name));
    const coveredNames = new Set<string>();

    const parsed: ParsedGroup[] = rawGroups
      .map((g, i) => {
        const validNames = (g.csvNames ?? []).filter(n => allCsvNames.has(n));
        validNames.forEach(n => coveredNames.add(n));
        return {
          groupId: g.groupId ?? i + 1,
          csvNames: validNames,
          rowCount: validNames.reduce((s, n) => s + (nameCountMap[n] ?? 0), 0),
          suggestedAction: (['create', 'map', 'skip'].includes(g.action)
            ? g.action : 'skip') as 'create' | 'map' | 'skip',
          suggestedProductId: g.productId,
          suggestedNameEn: g.name_en,
          suggestedNameEs: g.name_es,
        };
      })
      .filter(g => g.csvNames.length > 0);

    // Any CSV names the AI didn't cover → add as a skip group
    const uncovered = [...allCsvNames].filter(n => !coveredNames.has(n));
    if (uncovered.length > 0) {
      parsed.push({
        groupId: parsed.length + 1,
        csvNames: uncovered,
        rowCount: uncovered.reduce((s, n) => s + (nameCountMap[n] ?? 0), 0),
        suggestedAction: 'skip',
      });
    }

    // Build initial decisions from AI suggestions
    const auto: Record<number, GroupDecision> = {};
    for (const g of parsed) {
      auto[g.groupId] = {
        action: g.suggestedAction,
        productId: g.suggestedProductId,
        name_en: g.suggestedNameEn ?? g.csvNames[0],
        name_es: g.suggestedNameEs ?? g.csvNames[0],
        vendor_id: '',
      };
    }

    setGroups(parsed);
    setDecisions(auto);
    setStep('review');
  }

  // ── Step 3: execute import ──────────────────────────────────────────────────

  async function handleImport() {
    if (!csvFile) return;
    setStep('importing');

    const groupsPayload = groups.map(g => {
      const dec = decisions[g.groupId] ?? { action: 'skip' };
      return {
        groupId: g.groupId,
        csvNames: g.csvNames,
        action: dec.action,
        productId: dec.productId,
        name_en: dec.name_en,
        name_es: dec.name_es,
        vendor_id: dec.vendor_id || null,
      };
    });

    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('groups', JSON.stringify(groupsPayload));

    try {
      const res = await fetch('/api/admin/tour-normalization/execute', { method: 'POST', body: fd });
      const data = await res.json();
      setImportResult(res.ok ? data.result : { created: 0, updated: 0, skipped: 0, errors: [data.error] });
    } catch (err: any) {
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [err.message] });
    } finally {
      setStep('done');
    }
  }

  function setDec(groupId: number, patch: Partial<GroupDecision>) {
    setDecisions(prev => ({ ...prev, [groupId]: { ...prev[groupId], ...patch } }));
  }

  function reset() {
    setStep('upload');
    setCsvFile(null);
    setPrompt('');
    setUniqueNames([]);
    setNameCountMap({});
    setProducts([]);
    setVendors([]);
    setPastedResponse('');
    setGroups([]);
    setDecisions({});
    setImportResult(null);
    setParseError(null);
    setAiParseError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  // Stats for review summary
  const createCount  = groups.filter(g => decisions[g.groupId]?.action === 'create').length;
  const mapCount     = groups.filter(g => decisions[g.groupId]?.action === 'map').length;
  const skipCount    = groups.filter(g => decisions[g.groupId]?.action === 'skip').length;
  const importableRows = groups.reduce((s, g) =>
    decisions[g.groupId]?.action !== 'skip' ? s + g.rowCount : s, 0);

  const stepLabels = [
    { key: 'upload',  label: 'Upload CSV' },
    { key: 'paste',   label: 'Paste AI Response' },
    { key: 'review',  label: 'Review & Confirm' },
    { key: 'done',    label: 'Results' },
  ];
  const stepIndex: Record<string, number> = {
    upload: 0, parsing: 0, paste: 1, review: 2, importing: 2, done: 3,
  };
  const currentIdx = stepIndex[step] ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tour Bookings Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your CSV, copy the AI prompt, paste the response, assign vendors, then import.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {stepLabels.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i === currentIdx ? 'bg-blue-600 text-white' :
              i < currentIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{i + 1}</span>
            <span className={i === currentIdx ? 'font-medium text-gray-900' : 'text-gray-400'}>{s.label}</span>
            {i < stepLabels.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {(step === 'upload' || step === 'parsing') && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center space-y-4">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-base font-medium text-gray-700">Upload Tour Bookings CSV</p>
            <p className="text-sm text-gray-500 mt-1">
              Must include a &quot;Nombre de la actividad&quot; column with tour names
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full max-w-xs mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {parseError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 inline-block">{parseError}</p>
          )}
          <button
            onClick={handleParse}
            disabled={step === 'parsing'}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {step === 'parsing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Parsing CSV…
              </>
            ) : 'Parse & Get Prompt →'}
          </button>
        </div>
      )}

      {/* ── Step 2: Copy prompt + paste AI response ── */}
      {step === 'paste' && (
        <div className="space-y-5">
          <div className="bg-blue-50 rounded-xl border border-blue-200 px-4 py-3 text-sm text-blue-700">
            Found <strong>{uniqueNames.length}</strong> unique tour names across <strong>{totalRows}</strong> booking rows.
          </div>

          {/* Prompt box */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">1. Copy this prompt</h2>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Prompt</>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">Paste into ChatGPT, Claude, Gemini, etc. Ask for JSON only.</p>
            <textarea
              readOnly
              value={prompt}
              rows={12}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 font-mono resize-none focus:outline-none"
            />
          </div>

          {/* Paste response */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">2. Paste the AI response here</h2>
            <p className="text-xs text-gray-500">
              The AI should return a JSON array of groups. Paste the full reply — the JSON will be extracted automatically.
            </p>
            <textarea
              value={pastedResponse}
              onChange={e => setPastedResponse(e.target.value)}
              rows={10}
              placeholder="Paste the AI response here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {aiParseError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{aiParseError}</p>
            )}
            <div className="flex justify-between items-center pt-1">
              <button onClick={() => setStep('upload')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                ← Back
              </button>
              <button
                onClick={handleParseAIResponse}
                disabled={!pastedResponse.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Parse &amp; Review →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 'review' && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-700">{groups.length}</p>
              <p className="text-xs text-blue-500">Tour groups</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-700">{createCount}</p>
              <p className="text-xs text-green-500">New products</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-yellow-700">{mapCount}</p>
              <p className="text-xs text-yellow-500">Mapped to existing</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-600">{skipCount}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {groups.map(g => {
              const dec = decisions[g.groupId] ?? { action: 'skip' };

              return (
                <div
                  key={g.groupId}
                  className={`bg-white rounded-xl border-2 p-4 space-y-3 transition-colors ${
                    dec.action === 'create' ? 'border-green-300' :
                    dec.action === 'map'    ? 'border-blue-300' :
                    'border-gray-200'
                  }`}
                >
                  {/* Top row: CSV name tags + row count + action toggle */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {g.csvNames.map(n => (
                          <span key={n} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-mono">
                            {n}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">{g.rowCount} booking{g.rowCount !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {(['create', 'map', 'skip'] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => setDec(g.groupId, { action: a })}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                            dec.action === a
                              ? a === 'create' ? 'bg-green-500 text-white'
                              : a === 'map'    ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Create: EN/ES names + vendor */}
                  {dec.action === 'create' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">English Name</label>
                        <input
                          value={dec.name_en ?? ''}
                          onChange={e => setDec(g.groupId, { name_en: e.target.value })}
                          placeholder="e.g. Snorkeling Tour"
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Spanish Name</label>
                        <input
                          value={dec.name_es ?? ''}
                          onChange={e => setDec(g.groupId, { name_es: e.target.value })}
                          placeholder="e.g. Tour de Snorkel"
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                        <select
                          value={dec.vendor_id ?? ''}
                          onChange={e => setDec(g.groupId, { vendor_id: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                          <option value="">— No vendor —</option>
                          {vendors.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                              {v.type !== 'other' ? ` (${v.type})` : ''}
                            </option>
                          ))}
                        </select>
                        {!dec.vendor_id && (
                          <p className={`text-xs mt-0.5 ${VENDOR_TYPE_COLORS['other']}`}>
                            Assign a vendor so tour orders route correctly
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Map: product select */}
                  {dec.action === 'map' && (
                    <div className="pt-1 border-t border-gray-100">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Map to Product</label>
                      <select
                        value={dec.productId ?? ''}
                        onChange={e => setDec(g.groupId, { productId: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">— Select product —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name_en}{p.vendor_name ? ` — ${p.vendor_name}` : ''}
                          </option>
                        ))}
                      </select>
                      {!dec.productId && (
                        <p className="text-xs text-red-500 mt-0.5">Select a product or change to Create/Skip</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-gray-500">
              {importableRows} rows will be imported &middot; {createCount} new products &middot; {skipCount} groups skipped
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep('paste')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                ← Back
              </button>
              <button
                onClick={handleImport}
                disabled={importableRows === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Import {importableRows} Rows →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Importing spinner ── */}
      {step === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Importing tour bookings…</p>
          <p className="text-sm text-gray-500 mt-1">Creating products and saving bookings</p>
        </div>
      )}

      {/* ── Done ── */}
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
          <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
