'use client';

import { useState } from 'react';

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

type Step = 'analyze' | 'analyzing' | 'review' | 'executing' | 'done';

const TYPE_COLORS: Record<string, string> = {
  transfer: 'bg-blue-100 text-blue-700',
  tour: 'bg-green-100 text-green-700',
  spa: 'bg-purple-100 text-purple-700',
  restaurant: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function VendorNormalizationPage() {
  const [step, setStep] = useState<Step>('analyze');
  const [groups, setGroups] = useState<VendorGroup[]>([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, GroupDecision>>({});
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [executeResult, setExecuteResult] = useState<{
    groupsProcessed: number;
    vendorsDeactivated: number;
    transfersUpdated: number;
    tourProductsUpdated: number;
    vendorUsersUpdated: number;
    errors: string[];
  } | null>(null);

  async function handleAnalyze() {
    setStep('analyzing');
    setAnalyzeError(null);

    try {
      const res = await fetch('/api/admin/vendor-normalization/analyze');
      const data = await res.json();

      if (!res.ok) {
        setAnalyzeError(data.error);
        setStep('analyze');
        return;
      }

      setGroups(data.groups);
      setTotalVendors(data.totalVendors);

      // Auto-set default decisions: merge with AI-suggested master, skip if no duplicates
      const auto: Record<number, GroupDecision> = {};
      for (const g of data.groups as VendorGroup[]) {
        const suggested = g.vendors.find(v => v.isSuggestedMaster);
        if (suggested) {
          auto[g.groupId] = { action: 'merge', masterId: suggested.id };
        } else {
          auto[g.groupId] = { action: 'skip' };
        }
      }
      setDecisions(auto);
      setStep('review');
    } catch (err: any) {
      setAnalyzeError(err.message);
      setStep('analyze');
    }
  }

  async function handleExecute() {
    setStep('executing');

    const merges = groups
      .filter(g => decisions[g.groupId]?.action === 'merge')
      .map(g => {
        const dec = decisions[g.groupId] as { action: 'merge'; masterId: string };
        const duplicateIds = g.vendors
          .filter(v => v.id !== dec.masterId)
          .map(v => v.id);
        return { masterId: dec.masterId, duplicateIds };
      })
      .filter(m => m.duplicateIds.length > 0);

    try {
      const res = await fetch('/api/admin/vendor-normalization/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merges }),
      });
      const data = await res.json();

      if (res.ok) {
        setExecuteResult(data.result);
      } else {
        setExecuteResult({
          groupsProcessed: 0,
          vendorsDeactivated: 0,
          transfersUpdated: 0,
          tourProductsUpdated: 0,
          vendorUsersUpdated: 0,
          errors: [data.error],
        });
      }
    } catch (err: any) {
      setExecuteResult({
        groupsProcessed: 0,
        vendorsDeactivated: 0,
        transfersUpdated: 0,
        tourProductsUpdated: 0,
        vendorUsersUpdated: 0,
        errors: [err.message],
      });
    } finally {
      setStep('done');
    }
  }

  const mergeCount = groups.filter(g => decisions[g.groupId]?.action === 'merge').length;
  const skipCount = groups.filter(g => decisions[g.groupId]?.action === 'skip').length;

  const totalDuplicatesToDeactivate = groups
    .filter(g => decisions[g.groupId]?.action === 'merge')
    .reduce((sum, g) => sum + (g.vendors.length - 1), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Normalization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Use AI to detect duplicate vendor records and merge them — preserving all transfers, tour products, and users.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['analyze', 'review', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s || (step === 'analyzing' && s === 'analyze') ? 'bg-orange-500 text-white' :
              (step === 'review' && s === 'analyze') || step === 'done' || step === 'executing' ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>{i + 1}</span>
            <span className={(step === s || (step === 'analyzing' && s === 'analyze')) ? 'font-medium text-gray-900' : 'text-gray-400'}>
              {s === 'analyze' ? 'AI Analysis' : s === 'review' ? 'Review & Confirm' : 'Results'}
            </span>
            {i < 2 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Analyze */}
      {(step === 'analyze' || step === 'analyzing') && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.416A4.003 4.003 0 0112 16a4.003 4.003 0 01-2.79-1.134l-.347-.416z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800">Analyze vendors with Gemini AI</p>
            <p className="text-sm text-gray-500 mt-1">
              The AI will scan all vendors and identify duplicate records (typos, abbreviations, language variants).
              You will review every suggestion before any changes are made.
            </p>
          </div>
          {analyzeError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 inline-block">{analyzeError}</p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={step === 'analyzing'}
            className="px-8 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {step === 'analyzing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing with AI…
              </>
            ) : (
              'Analyze Vendors →'
            )}
          </button>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{totalVendors}</p>
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

          {/* Groups */}
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
                  {/* Group header */}
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

                  {/* Vendor cards */}
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
                          className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
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
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500 text-white font-semibold">
                                MASTER
                              </span>
                            )}
                            {!isMaster && isMerge && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                MERGE
                              </span>
                            )}
                            {v.isSuggestedMaster && !isMaster && (
                              <span className="text-xs text-orange-500">AI pick</span>
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
                            <p className="text-xs text-orange-600 mt-1.5">Click to make master</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-gray-500">
              {mergeCount} group{mergeCount !== 1 ? 's' : ''} to merge &middot; {skipCount} skipped &middot;{' '}
              {totalDuplicatesToDeactivate} vendor{totalDuplicatesToDeactivate !== 1 ? 's' : ''} will be deactivated
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('analyze')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                ← Re-analyze
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

      {/* Executing spinner */}
      {step === 'executing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Merging vendors…</p>
          <p className="text-sm text-gray-500 mt-1">Updating transfers, tour products, and users</p>
        </div>
      )}

      {/* Done */}
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
            Duplicate vendors are now inactive (marked with [MERGED]). You can review them in the Vendors page. Now you can run the Tour Product Builder.
          </p>

          <button
            onClick={() => { setStep('analyze'); setGroups([]); setDecisions({}); setExecuteResult(null); }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
}
