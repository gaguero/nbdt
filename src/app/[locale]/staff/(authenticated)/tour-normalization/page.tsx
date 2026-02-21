'use client';

import { useRef, useState } from 'react';
import { DataCurationNav } from '@/components/staff/DataCurationNav';

interface UniqueNameEntry {
  key: string;
  name: string;
  vendorLegacyId: string;
  vendorId: string | null;
  vendorName: string | null;
  count: number;
  newCount: number;
  existingCount: number;
}
interface TourProduct { id: string; name_en: string; name_es: string; vendor_name: string; }
interface Vendor { id: string; name: string; type: string; }

interface ParsedGroup {
  groupId: number;
  csvKeys: string[];
  csvLabels: string[];
  rowCount: number;
  newCount: number;
  existingCount: number;
  suggestedAction: 'create' | 'map' | 'skip';
  suggestedProductId?: string;
  suggestedNameEn?: string;
  suggestedNameEs?: string;
  suggestedVendorId?: string;
}

interface GroupDecision {
  action: 'create' | 'map' | 'skip';
  productId?: string;
  name_en?: string;
  name_es?: string;
  vendor_id?: string;
}

type Step = 'upload' | 'parsing' | 'paste' | 'review' | 'importing' | 'done';

function buildCompositeKey(name: string, vendorLegacyId: string): string {
  const n = (name || '').trim();
  const v = (vendorLegacyId || '').trim();
  return `${n}|||${v || 'NO_VENDOR'}`;
}

function keyToLabel(entry: UniqueNameEntry): string {
  return entry.vendorLegacyId
    ? `${entry.name} [${entry.vendorLegacyId}${entry.vendorName ? `: ${entry.vendorName}` : ''}]`
    : `${entry.name} [NO_VENDOR]`;
}

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
  const [totalNew, setTotalNew] = useState(0);
  const [totalExisting, setTotalExisting] = useState(0);

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
      setTotalNew(data.totalNew ?? data.totalRows);
      setTotalExisting(data.totalExisting ?? 0);
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

    let rawGroups: { groupId: number; csvKeys?: string[]; csvNames?: string[]; action: string; productId?: string; name_en?: string; name_es?: string }[];
    try {
      rawGroups = JSON.parse(jsonMatch[0]);
    } catch (_e) {
      setAiParseError('Invalid JSON. Ask the AI to return only the JSON array with no extra text.');
      return;
    }

    const allCsvKeys = new Set(uniqueNames.map(n => n.key));
    const coveredKeys = new Set<string>();
    const keyByLabel = new Map(uniqueNames.map((n) => [keyToLabel(n), n.key]));
    const keysByName = new Map<string, string[]>();
    for (const n of uniqueNames) {
      const base = n.name.toLowerCase().trim();
      if (!keysByName.has(base)) keysByName.set(base, []);
      keysByName.get(base)!.push(n.key);
    }

    // Build a per-key lookup for new/existing counts from the parse result
    const keyDetails = new Map(uniqueNames.map(n => [n.key, n]));

    function resolveTokenToKeys(token: string): string[] {
      const t = (token || '').trim();
      if (!t) return [];
      if (allCsvKeys.has(t)) return [t];
      if (keyByLabel.has(t)) return [keyByLabel.get(t)!];

      const labelMatch = t.match(/^(.*)\s+\[([^\]]+)\]$/);
      if (labelMatch) {
        const namePart = labelMatch[1].trim();
        const bracket = labelMatch[2].trim();
        const vendorLegacyId = bracket.split(':')[0].trim();
        const composite = buildCompositeKey(namePart, vendorLegacyId === 'NO_VENDOR' ? '' : vendorLegacyId);
        if (allCsvKeys.has(composite)) return [composite];
      }

      const byName = keysByName.get(t.toLowerCase().trim()) ?? [];
      return byName;
    }

    const parsed: ParsedGroup[] = rawGroups
      .map((g, i) => {
        const sourceKeys = (g.csvKeys && g.csvKeys.length > 0 ? g.csvKeys : g.csvNames ?? []);
        const validKeys = Array.from(new Set(sourceKeys.flatMap(resolveTokenToKeys)));
        validKeys.forEach(key => coveredKeys.add(key));
        const rowCount = validKeys.reduce((s, key) => s + (nameCountMap[key] ?? 0), 0);
        const existingCount = validKeys.reduce((s, key) => s + (keyDetails.get(key)?.existingCount ?? 0), 0);
        const csvLabels = validKeys.map((key) => {
          const d = keyDetails.get(key);
          return d ? keyToLabel(d) : key;
        });
        const vendorIds = Array.from(
          new Set(validKeys.map((key) => keyDetails.get(key)?.vendorId).filter(Boolean))
        ) as string[];
        return {
          groupId: g.groupId ?? i + 1,
          csvKeys: validKeys,
          csvLabels,
          rowCount,
          newCount: rowCount - existingCount,
          existingCount,
          suggestedAction: (['create', 'map', 'skip'].includes(g.action)
            ? g.action : 'skip') as 'create' | 'map' | 'skip',
          suggestedProductId: g.productId,
          suggestedNameEn: g.name_en ?? keyDetails.get(validKeys[0] ?? '')?.name,
          suggestedNameEs: g.name_es ?? keyDetails.get(validKeys[0] ?? '')?.name,
          suggestedVendorId: vendorIds.length === 1 ? vendorIds[0] : '',
        };
      })
      .filter(g => g.csvKeys.length > 0);

    // Any CSV names the AI didn't cover → add as a skip group
    const uncovered = [...allCsvKeys].filter(key => !coveredKeys.has(key));
    if (uncovered.length > 0) {
      const rowCount = uncovered.reduce((s, key) => s + (nameCountMap[key] ?? 0), 0);
      const existingCount = uncovered.reduce((s, key) => s + (keyDetails.get(key)?.existingCount ?? 0), 0);
      parsed.push({
        groupId: parsed.length + 1,
        csvKeys: uncovered,
        csvLabels: uncovered.map((key) => {
          const d = keyDetails.get(key);
          return d ? keyToLabel(d) : key;
        }),
        rowCount,
        newCount: rowCount - existingCount,
        existingCount,
        suggestedAction: 'skip',
      });
    }

    // Build initial decisions from AI suggestions
    const auto: Record<number, GroupDecision> = {};
    for (const g of parsed) {
      auto[g.groupId] = {
        action: g.suggestedAction,
        productId: g.suggestedProductId ?? '',
        name_en: g.suggestedNameEn ?? g.csvLabels[0] ?? '',
        name_es: g.suggestedNameEs ?? g.csvLabels[0] ?? '',
        vendor_id: g.suggestedVendorId ?? '',
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
        csvKeys: g.csvKeys,
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

  function hydrateGroup(keys: string[], groupId: number, current?: ParsedGroup): ParsedGroup {
    const keyDetails = new Map(uniqueNames.map(n => [n.key, n]));
    const rowCount = keys.reduce((s, key) => s + (nameCountMap[key] ?? 0), 0);
    const existingCount = keys.reduce((s, key) => s + (keyDetails.get(key)?.existingCount ?? 0), 0);
    const csvLabels = keys.map((key) => {
      const d = keyDetails.get(key);
      return d ? keyToLabel(d) : key;
    });
    return {
      groupId,
      csvKeys: keys,
      csvLabels,
      rowCount,
      newCount: rowCount - existingCount,
      existingCount,
      suggestedAction: current?.suggestedAction ?? 'skip',
      suggestedProductId: current?.suggestedProductId,
      suggestedNameEn: current?.suggestedNameEn ?? (keyDetails.get(keys[0] ?? '')?.name ?? ''),
      suggestedNameEs: current?.suggestedNameEs ?? (keyDetails.get(keys[0] ?? '')?.name ?? ''),
      suggestedVendorId: current?.suggestedVendorId ?? '',
    };
  }

  function moveKeyBetweenGroups(fromGroupId: number, key: string, target: string) {
    const source = groups.find(g => g.groupId === fromGroupId);
    if (!source) return;

    const nextGroups = [...groups];
    const sourceIdx = nextGroups.findIndex(g => g.groupId === fromGroupId);
    const sourceKeys = nextGroups[sourceIdx].csvKeys.filter(k => k !== key);
    nextGroups[sourceIdx] = hydrateGroup(sourceKeys, fromGroupId, nextGroups[sourceIdx]);

    let newGroupId: number | null = null;
    if (target === 'new') {
      newGroupId = Math.max(0, ...nextGroups.map(g => g.groupId)) + 1;
      nextGroups.push(hydrateGroup([key], newGroupId));
    } else {
      const toId = parseInt(target, 10);
      const targetIdx = nextGroups.findIndex(g => g.groupId === toId);
      if (targetIdx >= 0) {
        const merged = Array.from(new Set([...nextGroups[targetIdx].csvKeys, key]));
        nextGroups[targetIdx] = hydrateGroup(merged, toId, nextGroups[targetIdx]);
      }
    }

    const filteredGroups = nextGroups.filter(g => g.csvKeys.length > 0);
    setGroups(filteredGroups);

    setDecisions(prev => {
      const next = { ...prev };
      if (sourceKeys.length === 0) delete next[fromGroupId];
      if (newGroupId) {
        next[newGroupId] = {
          action: 'create',
          name_en: uniqueNames.find(n => n.key === key)?.name ?? '',
          name_es: uniqueNames.find(n => n.key === key)?.name ?? '',
          vendor_id: uniqueNames.find(n => n.key === key)?.vendorId ?? '',
        };
      }
      return next;
    });
  }

  function reset() {
    setStep('upload');
    setCsvFile(null);
    setPrompt('');
    setUniqueNames([]);
    setNameCountMap({});
    setProducts([]);
    setVendors([]);
    setTotalNew(0);
    setTotalExisting(0);
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
  const importableNew = groups.reduce((s, g) =>
    decisions[g.groupId]?.action !== 'skip' ? s + g.newCount : s, 0);
  const importableExisting = groups.reduce((s, g) =>
    decisions[g.groupId]?.action !== 'skip' ? s + g.existingCount : s, 0);

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
      <DataCurationNav />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>Tour Bookings Import</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>
          Upload your CSV, copy the AI prompt, paste the response, assign vendors, then import.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {stepLabels.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={
                i === currentIdx
                  ? { background: 'var(--gold)', color: '#fff' }
                  : i < currentIdx
                  ? { background: 'var(--sage)', color: '#fff' }
                  : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
              }
            >{i + 1}</span>
            <span style={{ color: i === currentIdx ? 'var(--charcoal)' : 'var(--muted-dim)', fontWeight: i === currentIdx ? 500 : 400 }}>{s.label}</span>
            {i < stepLabels.length - 1 && <span style={{ color: 'var(--muted-dim)' }}>→</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {(step === 'upload' || step === 'parsing') && (
        <div className="nayara-card p-12 text-center space-y-4" style={{ border: '2px dashed var(--separator)' }}>
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted-dim)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-base font-medium" style={{ color: 'var(--muted)' }}>Upload Tour Bookings CSV</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>
              Must include a &quot;Nombre de la actividad&quot; column with tour names
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full max-w-xs mx-auto text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium"
            style={{ color: 'var(--muted-dim)' }}
          />
          {parseError && (
            <p className="text-sm rounded-lg px-4 py-2 inline-block" style={{ background: 'rgba(236,108,75,0.1)', color: 'var(--terra)' }}>{parseError}</p>
          )}
          <button
            onClick={handleParse}
            disabled={step === 'parsing'}
            className="nayara-btn nayara-btn-primary flex items-center gap-2 mx-auto disabled:opacity-50"
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
          <div className="rounded-xl px-4 py-3 text-sm flex flex-wrap gap-4" style={{ background: 'rgba(170,142,103,0.08)', color: 'var(--gold)', border: '1px solid rgba(170,142,103,0.2)' }}>
            <span>Found <strong>{uniqueNames.length}</strong> unique tour names across <strong>{totalRows}</strong> booking rows.</span>
            <span style={{ color: 'var(--sage)' }}><strong>{totalNew}</strong> new rows to import</span>
            {totalExisting > 0 && (
              <span style={{ color: 'var(--terra)' }}><strong>{totalExisting}</strong> already in the database (will be updated)</span>
            )}
          </div>

          {/* Prompt box */}
          <div className="nayara-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: 'var(--charcoal)' }}>1. Copy this prompt</h2>
              <button
                onClick={handleCopy}
                className={`nayara-btn ${copied ? 'nayara-btn-secondary' : 'nayara-btn-primary'} flex items-center gap-1.5 px-4 py-1.5`}
              >
                {copied ? (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Prompt</>
                )}
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-dim)' }}>Paste into ChatGPT, Claude, Gemini, etc. Ask for JSON only.</p>
            <textarea
              readOnly
              value={prompt}
              rows={12}
              className="nayara-input w-full px-3 py-2 text-xs font-mono resize-none"
              style={{ background: 'var(--elevated)' }}
            />
          </div>

          {/* Paste response */}
          <div className="nayara-card p-5 space-y-3">
            <h2 className="font-semibold" style={{ color: 'var(--charcoal)' }}>2. Paste the AI response here</h2>
            <p className="text-xs" style={{ color: 'var(--muted-dim)' }}>
              The AI should return a JSON array of groups. Paste the full reply — the JSON will be extracted automatically.
            </p>
            <textarea
              value={pastedResponse}
              onChange={e => setPastedResponse(e.target.value)}
              rows={10}
              placeholder="Paste the AI response here..."
              className="nayara-input w-full px-3 py-2 text-xs font-mono resize-y"
            />
            {aiParseError && (
              <p className="text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(236,108,75,0.1)', color: 'var(--terra)' }}>{aiParseError}</p>
            )}
            <div className="flex justify-between items-center pt-1">
              <button onClick={() => setStep('upload')} className="nayara-btn nayara-btn-ghost px-4 py-2 text-sm">
                ← Back
              </button>
              <button
                onClick={handleParseAIResponse}
                disabled={!pastedResponse.trim()}
                className="nayara-btn nayara-btn-primary px-6 py-2 disabled:opacity-50"
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
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(170,142,103,0.08)', border: '1px solid rgba(170,142,103,0.2)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{groups.length}</p>
              <p className="text-xs" style={{ color: 'var(--gold)', opacity: 0.8 }}>Tour groups</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(78,94,62,0.08)', border: '1px solid rgba(78,94,62,0.2)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--sage)' }}>{createCount}</p>
              <p className="text-xs" style={{ color: 'var(--sage)', opacity: 0.8 }}>New products</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(170,142,103,0.06)', border: '1px solid rgba(170,142,103,0.15)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{mapCount}</p>
              <p className="text-xs" style={{ color: 'var(--gold)', opacity: 0.7 }}>Mapped to existing</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--muted)' }}>{skipCount}</p>
              <p className="text-xs" style={{ color: 'var(--muted-dim)' }}>Skipped</p>
            </div>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {groups.map(g => {
              const dec = decisions[g.groupId] ?? { action: 'skip' };

              return (
                <div
                  key={g.groupId}
                  className="nayara-card p-4 space-y-3"
                  style={{
                    borderColor: dec.action === 'create' ? 'rgba(78,94,62,0.4)' :
                      dec.action === 'map' ? 'rgba(170,142,103,0.4)' :
                      'var(--separator)',
                  }}
                >
                  {/* Top row: CSV name tags + row count + action toggle */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest" style={{ background: 'var(--sidebar-bg)', color: '#fff' }}>
                          Group #{g.groupId}
                        </span>
                        {dec.action === 'create' && dec.name_en && (
                          <span className="text-xs font-bold truncate max-w-[200px]" style={{ color: 'var(--sage)' }}>
                            → {dec.name_en}
                          </span>
                        )}
                        {dec.action === 'map' && dec.productId && (
                          <span className="text-xs font-bold truncate max-w-[200px]" style={{ color: 'var(--gold)' }}>
                            → {products.find(p => p.id === dec.productId)?.name_en}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mb-1">
                        {g.csvKeys.map((key) => {
                          const detail = uniqueNames.find((n) => n.key === key);
                          const label = detail ? keyToLabel(detail) : key;
                          return (
                            <div key={key} className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--elevated)', color: 'var(--muted)' }}>
                                {label}
                              </span>
                              <select
                                className="nayara-input text-[11px] px-1.5 py-0.5 max-w-[150px]"
                                defaultValue=""
                                onChange={(e) => {
                                  const target = e.target.value;
                                  if (!target) return;
                                  moveKeyBetweenGroups(g.groupId, key, target);
                                  e.target.value = '';
                                }}
                              >
                                <option value="">Move record...</option>
                                {groups
                                  .filter(other => other.groupId !== g.groupId)
                                  .map(other => {
                                    const otherDec = decisions[other.groupId];
                                    let label = `Group ${other.groupId}`;
                                    if (otherDec?.action === 'create' && otherDec.name_en) {
                                      label += `: ${otherDec.name_en}`;
                                    } else if (otherDec?.action === 'map' && otherDec.productId) {
                                      const p = products.find(prod => prod.id === otherDec.productId);
                                      if (p) label += `: ${p.name_en}`;
                                    }
                                    return (
                                      <option key={other.groupId} value={other.groupId}>
                                        {label}
                                      </option>
                                    );
                                  })}
                                <option value="new">New group</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-dim)' }}>
                        <span>{g.rowCount} booking{g.rowCount !== 1 ? 's' : ''}</span>
                        {g.existingCount > 0 && (
                          <>
                            <span style={{ color: 'var(--sage)', fontWeight: 500 }}>{g.newCount} new</span>
                            <span style={{ color: 'var(--terra)' }}>{g.existingCount} already imported</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {(['create', 'map', 'skip'] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => setDec(g.groupId, { action: a })}
                          className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                          style={
                            dec.action === a
                              ? a === 'create'
                                ? { background: 'var(--sage)', color: '#fff' }
                                : a === 'map'
                                ? { background: 'var(--gold)', color: '#fff' }
                                : { background: 'var(--muted)', color: '#fff' }
                              : { background: 'var(--elevated)', color: 'var(--muted-dim)' }
                          }
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Create: EN/ES names + vendor */}
                  {dec.action === 'create' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1" style={{ borderTop: '1px solid var(--separator)' }}>
                      <div>
                        <label className="nayara-label block mb-1">English Name</label>
                        <input
                          value={dec.name_en ?? ''}
                          onChange={e => setDec(g.groupId, { name_en: e.target.value })}
                          placeholder="e.g. Snorkeling Tour"
                          className="nayara-input w-full"
                        />
                      </div>
                      <div>
                        <label className="nayara-label block mb-1">Spanish Name</label>
                        <input
                          value={dec.name_es ?? ''}
                          onChange={e => setDec(g.groupId, { name_es: e.target.value })}
                          placeholder="e.g. Tour de Snorkel"
                          className="nayara-input w-full"
                        />
                      </div>
                      <div>
                        <label className="nayara-label block mb-1">Vendor</label>
                        <select
                          value={dec.vendor_id ?? ''}
                          onChange={e => setDec(g.groupId, { vendor_id: e.target.value })}
                          className="nayara-input w-full"
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
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                            Assign a vendor so tour orders route correctly
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Map: product select */}
                  {dec.action === 'map' && (
                    <div className="pt-1" style={{ borderTop: '1px solid var(--separator)' }}>
                      <label className="nayara-label block mb-1">Map to Product</label>
                      <select
                        value={dec.productId ?? ''}
                        onChange={e => setDec(g.groupId, { productId: e.target.value })}
                        className="nayara-input w-full"
                      >
                        <option value="">— Select product —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name_en}{p.vendor_name ? ` — ${p.vendor_name}` : ''}
                          </option>
                        ))}
                      </select>
                      {!dec.productId && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--terra)' }}>Select a product or change to Create/Skip</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm space-y-0.5" style={{ color: 'var(--muted-dim)' }}>
              <p>
                <span style={{ color: 'var(--sage)', fontWeight: 500 }}>{importableNew} new</span>
                {importableExisting > 0 && <> + <span style={{ color: 'var(--terra)', fontWeight: 500 }}>{importableExisting} updates</span></>}
                {' '}rows &middot; {createCount} new products &middot; {skipCount} groups skipped
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('paste')} className="nayara-btn nayara-btn-ghost px-4 py-2 text-sm">
                ← Back
              </button>
              <button
                onClick={handleImport}
                disabled={importableRows === 0}
                className="nayara-btn nayara-btn-primary px-6 py-2 disabled:opacity-50"
              >
                {importableExisting > 0
                  ? `Import ${importableNew} new + ${importableExisting} updates →`
                  : `Import ${importableRows} Rows →`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Importing spinner ── */}
      {step === 'importing' && (
        <div className="nayara-card p-12 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
          <p className="font-medium" style={{ color: 'var(--charcoal)' }}>Importing tour bookings…</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>Creating products and saving bookings</p>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && importResult && (
        <div className="nayara-card p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(78,94,62,0.15)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--sage)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--charcoal)' }}>Import Complete</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(78,94,62,0.08)', border: '1px solid rgba(78,94,62,0.2)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--sage)' }}>{importResult.created}</p>
              <p className="text-sm" style={{ color: 'var(--sage)', opacity: 0.8 }}>New bookings</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(170,142,103,0.08)', border: '1px solid rgba(170,142,103,0.2)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{importResult.updated}</p>
              <p className="text-sm" style={{ color: 'var(--gold)', opacity: 0.8 }}>Updated</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ background: 'var(--elevated)', border: '1px solid var(--separator)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--muted)' }}>{importResult.skipped}</p>
              <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>Skipped</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(236,108,75,0.08)', border: '1px solid rgba(236,108,75,0.2)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--terra)' }}>{importResult.errors.length} errors:</p>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto" style={{ color: 'var(--terra)' }}>
                {importResult.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <button onClick={reset} className="nayara-btn nayara-btn-primary px-4 py-2 text-sm">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
