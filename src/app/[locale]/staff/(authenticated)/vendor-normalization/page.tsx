'use client';

import { useState } from 'react';
import { DataCurationNav } from '@/components/staff/DataCurationNav';

interface VendorInfo {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  transfer_count: number;
  tour_product_count: number;
  isSuggestedMaster: boolean;
}

interface VendorGroup {
  groupId: number;
  reason: string;
  vendors: VendorInfo[];
}

type GroupDecision =
  | { action: 'merge'; masterId: string }
  | { action: 'skip' };

type Step = 'generate' | 'paste' | 'review' | 'executing' | 'done';

const TYPE_COLORS: Record<string, string> = {
  transfer: 'bg-blue-100 text-blue-700',
  tour: 'bg-green-100 text-green-700',
  spa: 'bg-purple-100 text-purple-700',
  restaurant: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function VendorNormalizationPage() {
  const [step, setStep] = useState<Step>('generate');
  const [prompt, setPrompt] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [pastedResponse, setPastedResponse] = useState('');
  const [groups, setGroups] = useState<VendorGroup[]>([]);
  const [decisions, setDecisions] = useState<Record<number, GroupDecision>>({});
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [executeResult, setExecuteResult] = useState<{
    groupsProcessed: number;
    vendorsDeactivated: number;
    transfersUpdated: number;
    tourProductsUpdated: number;
    vendorUsersUpdated: number;
    errors: string[];
  } | null>(null);

  async function handleGeneratePrompt() {
    setLoadingPrompt(true);
    setPromptError(null);
    try {
      const res = await fetch('/api/admin/vendor-normalization/analyze');
      const data = await res.json();
      if (!res.ok) { setPromptError(data.error); return; }
      setPrompt(data.prompt);
      setVendors(data.vendors);
      setStep('paste');
    } catch (err: any) {
      setPromptError(err.message);
    } finally {
      setLoadingPrompt(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleParseResponse() {
    setParseError(null);
    const text = pastedResponse.trim();
    if (!text) { setParseError('Please paste the AI response first.'); return; }

    // Extract JSON array from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      setParseError('Could not find a JSON array in the response. Make sure you copied the full AI reply.');
      return;
    }

    let rawGroups: { groupId: number; reason: string; vendors: { id: string; name: string; isSuggestedMaster: boolean }[] }[];
    try {
      rawGroups = JSON.parse(jsonMatch[0]);
    } catch (_e) {
      setParseError('The JSON is invalid. Try asking the AI to return only the JSON array with no extra text.');
      return;
    }

    // Enrich with full vendor data
    const vendorMap = new Map(vendors.map((v: any) => [v.id, v]));
    const enriched: VendorGroup[] = rawGroups.map(g => ({
      ...g,
      vendors: g.vendors.map(gv => {
        const full = vendorMap.get(gv.id) as any;
        return {
          id: gv.id,
          name: full?.name ?? gv.name,
          type: full?.type ?? 'other',
          email: full?.email ?? null,
          phone: full?.phone ?? null,
          is_active: full?.is_active ?? false,
          transfer_count: full?.transfer_count ?? 0,
          tour_product_count: full?.tour_product_count ?? 0,
          isSuggestedMaster: gv.isSuggestedMaster,
        };
      }),
    }));

    setGroups(enriched);

    // Auto-set decisions using the AI suggestion
    const auto: Record<number, GroupDecision> = {};
    for (const g of enriched) {
      const suggested = g.vendors.find(v => v.isSuggestedMaster);
      if (suggested) {
        auto[g.groupId] = { action: 'merge', masterId: suggested.id };
      } else {
        auto[g.groupId] = { action: 'skip' };
      }
    }
    setDecisions(auto);
    setStep('review');
  }

  async function handleExecute() {
    setStep('executing');

    const merges = groups
      .filter(g => decisions[g.groupId]?.action === 'merge')
      .map(g => {
        const dec = decisions[g.groupId] as { action: 'merge'; masterId: string };
        return {
          masterId: dec.masterId,
          duplicateIds: g.vendors.filter(v => v.id !== dec.masterId).map(v => v.id),
        };
      })
      .filter(m => m.duplicateIds.length > 0);

    try {
      const res = await fetch('/api/admin/vendor-normalization/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merges }),
      });
      const data = await res.json();
      setExecuteResult(res.ok ? data.result : {
        groupsProcessed: 0, vendorsDeactivated: 0, transfersUpdated: 0,
        tourProductsUpdated: 0, vendorUsersUpdated: 0, errors: [data.error],
      });
    } catch (err: any) {
      setExecuteResult({
        groupsProcessed: 0, vendorsDeactivated: 0, transfersUpdated: 0,
        tourProductsUpdated: 0, vendorUsersUpdated: 0, errors: [err.message],
      });
    } finally {
      setStep('done');
    }
  }

  function reset() {
    setStep('generate');
    setPrompt('');
    setVendors([]);
    setPastedResponse('');
    setGroups([]);
    setDecisions({});
    setExecuteResult(null);
    setPromptError(null);
    setParseError(null);
  }

  const mergeCount = groups.filter(g => decisions[g.groupId]?.action === 'merge').length;
  const skipCount = groups.filter(g => decisions[g.groupId]?.action === 'skip').length;
  const totalDuplicatesToDeactivate = groups
    .filter(g => decisions[g.groupId]?.action === 'merge')
    .reduce((sum, g) => sum + (g.vendors.length - 1), 0);

  // Step labels
  const stepLabels = [
    { key: 'generate', label: 'Get Prompt' },
    { key: 'paste', label: 'Paste AI Response' },
    { key: 'review', label: 'Review & Confirm' },
    { key: 'done', label: 'Results' },
  ];
  const stepIndex = { generate: 0, paste: 1, review: 2, executing: 2, done: 3 };
  const currentIndex = stepIndex[step];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <DataCurationNav />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Normalization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Detect and merge duplicate vendor records using any AI assistant — no API key needed.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {stepLabels.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i === currentIndex ? 'bg-orange-500 text-white' :
              i < currentIndex ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>{i + 1}</span>
            <span className={i === currentIndex ? 'font-medium text-gray-900' : 'text-gray-400'}>
              {s.label}
            </span>
            {i < stepLabels.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Generate Prompt ── */}
      {step === 'generate' && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-base font-semibold text-gray-800">How it works</p>
            <ol className="text-sm text-gray-500 mt-3 text-left space-y-2 list-decimal list-inside">
              <li>Click <strong>Generate Prompt</strong> — we build a prompt from your vendor database.</li>
              <li>Copy the prompt and paste it into any AI (ChatGPT, Claude, Gemini, etc.).</li>
              <li>Copy the AI response and paste it back here.</li>
              <li>Review the suggested merges and confirm.</li>
            </ol>
          </div>
          {promptError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 inline-block">{promptError}</p>
          )}
          <button
            onClick={handleGeneratePrompt}
            disabled={loadingPrompt}
            className="px-8 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {loadingPrompt ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading vendors…
              </>
            ) : 'Generate Prompt →'}
          </button>
        </div>
      )}

      {/* ── Step 2: Copy prompt + Paste response ── */}
      {step === 'paste' && (
        <div className="space-y-5">
          {/* Prompt box */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">1. Copy this prompt</h2>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Prompt
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Paste into ChatGPT, Claude, Gemini, or any AI assistant. Ask it to return only the JSON.
            </p>
            <textarea
              readOnly
              value={prompt}
              rows={10}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 font-mono resize-none focus:outline-none"
            />
          </div>

          {/* Paste response */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">2. Paste the AI response here</h2>
            <p className="text-xs text-gray-500">
              The AI should return a JSON array. Paste the entire response — we will extract the JSON automatically.
            </p>
            <textarea
              value={pastedResponse}
              onChange={e => setPastedResponse(e.target.value)}
              rows={10}
              placeholder='Paste the AI response here...'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {parseError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{parseError}</p>
            )}
            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => setStep('generate')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleParseResponse}
                disabled={!pastedResponse.trim()}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                Parse &amp; Review →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review groups ── */}
      {step === 'review' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{vendors.length}</p>
              <p className="text-sm text-orange-500">Total vendors</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{groups.length}</p>
              <p className="text-sm text-red-500">Duplicate groups found</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalDuplicatesToDeactivate}</p>
              <p className="text-sm text-green-500">Will be deactivated</p>
            </div>
          </div>

          <div className="space-y-4">
            {groups.map(g => {
              const dec = decisions[g.groupId] || { action: 'skip' };
              const isMerge = dec.action === 'merge';
              const masterId = isMerge ? dec.masterId : null;

              return (
                <div
                  key={g.groupId}
                  className={`bg-white rounded-xl border-2 p-5 space-y-3 transition-colors ${
                    isMerge ? 'border-orange-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Group {g.groupId}</p>
                      <p className="text-xs text-gray-500 mt-0.5 italic">{g.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const suggested = g.vendors.find(v => v.isSuggestedMaster);
                          setDecisions(prev => ({
                            ...prev,
                            [g.groupId]: { action: 'merge', masterId: suggested?.id ?? g.vendors[0].id },
                          }));
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isMerge
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
                        }`}
                      >
                        Merge
                      </button>
                      <button
                        onClick={() => setDecisions(prev => ({ ...prev, [g.groupId]: { action: 'skip' } }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          !isMerge
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {g.vendors.map(v => {
                      const isMaster = masterId === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            if (isMerge) {
                              setDecisions(prev => ({ ...prev, [g.groupId]: { action: 'merge', masterId: v.id } }));
                            }
                          }}
                          className={`rounded-lg border-2 p-3 transition-all ${
                            isMerge ? 'cursor-pointer' : ''
                          } ${
                            isMaster
                              ? 'border-orange-400 bg-orange-50'
                              : isMerge
                              ? 'border-red-200 bg-red-50/30 opacity-70'
                              : 'border-gray-200 bg-gray-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[v.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {v.type}
                            </span>
                            {isMaster && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white font-semibold">MASTER</span>
                            )}
                            {!isMaster && isMerge && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">MERGE</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{v.name}</p>
                          {v.email && <p className="text-xs text-gray-500 mt-1">{v.email}</p>}
                          {v.phone && <p className="text-xs text-gray-500">{v.phone}</p>}
                          <div className="flex gap-3 mt-2 text-xs text-gray-400">
                            <span>{v.transfer_count} transfers</span>
                            <span>{v.tour_product_count} tours</span>
                            {!v.is_active && <span className="text-red-400">inactive</span>}
                          </div>
                          {isMerge && !isMaster && (
                            <p className="text-xs text-orange-500 mt-1.5">Click to make master</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-gray-500">
              {mergeCount} group{mergeCount !== 1 ? 's' : ''} to merge &middot; {skipCount} skipped &middot;{' '}
              {totalDuplicatesToDeactivate} vendor{totalDuplicatesToDeactivate !== 1 ? 's' : ''} will be deactivated
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('paste')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleExecute}
                disabled={mergeCount === 0}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                Merge {mergeCount} Group{mergeCount !== 1 ? 's' : ''} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Executing spinner ── */}
      {step === 'executing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Merging vendors…</p>
          <p className="text-sm text-gray-500 mt-1">Updating transfers, tour products, and users</p>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && executeResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Normalization Complete</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{executeResult.groupsProcessed}</p>
              <p className="text-xs text-orange-500 mt-1">Groups merged</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{executeResult.vendorsDeactivated}</p>
              <p className="text-xs text-red-500 mt-1">Vendors deactivated</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{executeResult.transfersUpdated}</p>
              <p className="text-xs text-blue-500 mt-1">Transfers re-linked</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{executeResult.tourProductsUpdated}</p>
              <p className="text-xs text-green-500 mt-1">Tour products re-linked</p>
            </div>
          </div>

          {executeResult.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-2">{executeResult.errors.length} error{executeResult.errors.length !== 1 ? 's' : ''}:</p>
              <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                {executeResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-500">
            Duplicate vendors are now inactive (marked [MERGED]). You can review them in the Vendors page.
          </p>

          <button onClick={reset} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
            Run Again
          </button>
        </div>
      )}
    </div>
  );
}
