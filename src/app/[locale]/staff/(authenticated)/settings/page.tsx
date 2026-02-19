'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DataCurationNav } from '@/components/staff/DataCurationNav';
import {
  TrashIcon, ServerIcon, ExclamationTriangleIcon, ArrowPathIcon,
  CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronRightIcon,
  ArrowTopRightOnSquareIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface DbStat {
  table: string;
  count: number;
}

interface SyncLog {
  id: string;
  synced_at: string;
  triggered_by: string;
  emails_found: number;
  xmls_processed: number;
  created_details: any[];
  updated_details: any[];
  errors: string[];
}

const CLEAR_ORDER = [
  'messages', 'conversations', 'order_items', 'orders',
  'romantic_dinners', 'special_requests', 'other_hotel_bookings',
  'tour_bookings', 'tour_schedules', 'transfers', 'reservations',
  'guests', 'vendors', 'tour_products'
];

interface StepCardProps {
  step: number;
  title: string;
  subtitle: string;
  tables: string[];
  getCount: (t: string) => number;
  locked: boolean;
  lockReason?: string;
  recommendation?: string;
  lastRun?: string;
  children: React.ReactNode;
  fileRef?: string;
}

function StepCard({ step, title, subtitle, tables, getCount, locked, lockReason, recommendation, lastRun, children, fileRef }: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const totalCount = tables.reduce((sum, t) => sum + getCount(t), 0);
  const hasData = totalCount > 0;

  return (
    <div className={`rounded-xl border ${locked ? 'border-gray-200 opacity-60' : 'border-gray-200'} bg-white overflow-hidden`}>
      <button
        onClick={() => !locked && setExpanded(!expanded)}
        disabled={locked}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
      >
        {/* Step circle */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
          locked ? 'bg-gray-200 text-gray-400' : hasData ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {locked ? <LockClosedIcon className="h-4 w-4" /> : step}
        </div>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            {locked && lockReason && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lockReason}</span>
            )}
            {!locked && recommendation && (
              <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{recommendation}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          {!locked && lastRun && (
            <p className="text-[10px] text-gray-400 mt-0.5">Last run: {lastRun}</p>
          )}
        </div>

        {/* Count badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {tables.map(t => (
            <span key={t} className={`text-xs font-mono px-2 py-0.5 rounded-full ${
              getCount(t) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {getCount(t).toLocaleString()} {t}
            </span>
          ))}
          {!locked && (expanded ? <ChevronDownIcon className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />)}
        </div>
      </button>

      {expanded && !locked && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {fileRef && (
            <p className="text-[10px] text-gray-400 font-mono">CSV: {fileRef}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const staffHref = (path: string) => `/${locale}/staff/${path}`;

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dbStats, setDbStats] = useState<DbStat[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<{ id: string; section: 'created' | 'updated' | 'errors' } | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('import-wizard');

  const fetchDbStats = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/admin/db-manager');
      const data = await res.json();
      if (res.ok) setDbStats(data.stats || []);
    } catch (err) { console.error(err); }
    finally { setLoadingDb(false); }
  }, []);

  const fetchSyncLogs = useCallback(async () => {
    const res = await fetch('/api/admin/opera-sync');
    if (res.ok) { const d = await res.json(); setSyncLogs(d.logs ?? []); }
  }, []);

  useEffect(() => { fetchDbStats(); fetchSyncLogs(); }, [fetchDbStats, fetchSyncLogs]);

  const getCount = (table: string): number => {
    const stat = dbStats.find(s => s.table === table);
    return stat?.count ?? 0;
  };

  const latestSyncRun = syncLogs[0]?.synced_at
    ? new Date(syncLogs[0].synced_at).toLocaleString()
    : undefined;

  const moduleCatalog = [
    { key: 'import-wizard', label: 'Guest Import' },
    { key: 'vendor-import-wizard', label: 'Vendor Import' },
    { key: 'transfer-wizard', label: 'Transfer Import' },
    { key: 'tour-normalization', label: 'Tour Import' },
    { key: 'guest-normalization', label: 'Guest Normalization' },
    { key: 'vendor-normalization', label: 'Vendor Normalization' },
    { key: 'data-curation-settings', label: 'Configuration' },
  ] as const;

  const activeModuleLabel = moduleCatalog.find(m => m.key === activeModule)?.label ?? 'Workspace';

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/admin/opera-sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const s = data.summary;
        setSyncStatus(`Sync complete — ${s.emails_found} email(s), ${s.xmls_processed} XML(s), ${s.reservations_created} created, ${s.reservations_updated} updated${s.errors.length ? `, ${s.errors.length} error(s)` : ''}.`);
        fetchSyncLogs();
        fetchDbStats();
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearTable = async (table: string) => {
    if (!confirm(`DANGER: Are you sure you want to PERMANENTLY DELETE ALL records from ${table}? This will also delete linked data in other tables via CASCADE.`)) return;
    try {
      const res = await fetch(`/api/admin/db-manager?table=${table}`, { method: 'DELETE' });
      if (res.ok) fetchDbStats();
    } catch { alert('Failed to clear table'); }
  };

  const handleClearAll = async () => {
    if (!confirm('DANGER: This will DELETE ALL DATA from ALL tables. This is irreversible. Are you sure?')) return;
    if (!confirm('FINAL WARNING: All guests, reservations, transfers, tours, orders, messages — EVERYTHING will be permanently deleted. Continue?')) return;
    setClearingAll(true);
    try {
      for (const table of CLEAR_ORDER) {
        await fetch(`/api/admin/db-manager?table=${table}`, { method: 'DELETE' });
      }
      await fetchDbStats();
    } catch { alert('Error during clear — some tables may not have been cleared.'); }
    finally { setClearingAll(false); }
  };

  async function handleOperaImport(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/opera/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const { created: added, updated, unchanged, total, errors } = data.result;
        const errorCount = errors?.length ?? 0;
        setImportStatus(`Import complete: ${total} records — ${added} new, ${updated} updated, ${unchanged} unchanged${errorCount > 0 ? `, ${errorCount} errors` : ''}.`);
        fetchDbStats();
        fetchSyncLogs();
      } else {
        setImportStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const renderSyncLog = (log: SyncLog) => {
    const createdList: any[] = Array.isArray(log.created_details) ? log.created_details : [];
    const updatedList: any[] = Array.isArray(log.updated_details) ? log.updated_details : [];
    const errorsList: string[] = Array.isArray(log.errors) ? log.errors : [];
    const isExpanded = expandedLog?.id === log.id;
    const expandedSection = isExpanded ? expandedLog?.section : null;
    const toggle = (section: 'created' | 'updated' | 'errors') => {
      if (isExpanded && expandedSection === section) setExpandedLog(null);
      else setExpandedLog({ id: log.id, section });
    };
    const hasErrors = errorsList.length > 0;

    return (
      <div key={log.id} className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-2 flex-wrap">
          {hasErrors
            ? <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            : <CheckCircleIcon className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
          <span className="text-gray-400 font-mono">{new Date(log.synced_at).toLocaleString()}</span>
          <span className="text-gray-400 capitalize">[{log.triggered_by}]</span>
          {log.triggered_by !== 'upload' && (
            <span className="text-gray-500">{log.emails_found} email(s) · {log.xmls_processed} XML(s)</span>
          )}
          {createdList.length > 0 ? (
            <button onClick={() => toggle('created')} className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expandedSection === 'created' ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
              {createdList.length} new
            </button>
          ) : <span className="text-gray-400">0 new</span>}
          {updatedList.length > 0 ? (
            <button onClick={() => toggle('updated')} className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expandedSection === 'updated' ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
              {updatedList.length} updated
            </button>
          ) : <span className="text-gray-400">0 updated</span>}
          {errorsList.length > 0 && (
            <button onClick={() => toggle('errors')} className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expandedSection === 'errors' ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
              {errorsList.length} error(s)
            </button>
          )}
        </div>
        {isExpanded && expandedSection === 'created' && createdList.length > 0 && (
          <div className="border-t border-gray-100 bg-green-50 px-3 py-2">
            <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">New Reservations</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {createdList.map((r: any) => (
                <div key={r.opera_resv_id} className="flex gap-3 text-xs text-green-900">
                  <span className="font-mono text-green-600 w-16 shrink-0">{r.room || '—'}</span>
                  <span className="flex-1">{r.guest_name}</span>
                  <span className="text-green-600 shrink-0">{r.arrival} → {r.departure}</span>
                  <span className="text-green-500 shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isExpanded && expandedSection === 'updated' && updatedList.length > 0 && (
          <div className="border-t border-gray-100 bg-blue-50 px-3 py-2">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Updated Reservations</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {updatedList.map((r: any) => (
                <div key={r.opera_resv_id} className="flex gap-3 text-xs text-blue-900">
                  <span className="font-mono text-blue-600 w-16 shrink-0">{r.room || '—'}</span>
                  <span className="flex-1">{r.guest_name}</span>
                  <span className="text-blue-600 shrink-0">{r.arrival} → {r.departure}</span>
                  <span className="text-blue-500 shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isExpanded && expandedSection === 'errors' && errorsList.length > 0 && (
          <div className="border-t border-gray-100 bg-red-50 px-3 py-2">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Errors</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {errorsList.map((err: string, i: number) => (
                <p key={i} className="text-xs text-red-700 font-mono break-all">{err}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <DataCurationNav />
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Curation Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Unified workspace: run every import, sync, and normalization module without leaving this page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveModule('data-curation-settings')}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          <Cog6ToothIcon className="h-4 w-4" />
          Open Configuration
        </button>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-semibold">Unified Module Runner</p>
            <h2 className="text-lg font-semibold text-gray-900">{activeModuleLabel}</h2>
            <p className="text-xs text-gray-500">All tools run in this page. Use step cards below to jump modules instantly.</p>
          </div>
          <Link
            href={staffHref(activeModule)}
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open module in new tab
          </Link>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
          {moduleCatalog.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setActiveModule(m.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeModule === m.key
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-inner">
          <iframe
            title={activeModuleLabel}
            src={staffHref(activeModule)}
            className="w-full h-[860px] bg-white"
          />
        </div>
      </section>

      {/* Loading indicator */}
      {loadingDb && (
        <div className="text-center py-4 text-gray-400 animate-pulse text-sm">Loading database stats...</div>
      )}

      {/* Step 0 — Database Reset */}
      {!loadingDb && (
        <div className={`rounded-xl border ${showReset ? 'border-red-300' : 'border-red-200'} bg-white overflow-hidden`}>
          <button
            onClick={() => setShowReset(!showReset)}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-red-50 transition-colors"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-red-100 text-red-600">
              <ServerIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-700 text-sm">Step 0 — Database Reset</h3>
              <p className="text-xs text-gray-500">Clear all tables for a fresh start (dev/testing only)</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {dbStats.reduce((sum, s) => sum + s.count, 0).toLocaleString()} total records
              </span>
              {showReset ? <ChevronDownIcon className="h-4 w-4 text-red-400" /> : <ChevronRightIcon className="h-4 w-4 text-red-400" />}
            </div>
          </button>

          {showReset && (
            <div className="border-t border-red-100 p-4 bg-red-50 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  {clearingAll ? 'Clearing...' : 'Clear All Tables'}
                </button>
                <button
                  onClick={fetchDbStats}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-gray-600 rounded-lg text-sm border border-gray-200 hover:bg-gray-50"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  Refresh Counts
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dbStats.map((s) => (
                  <div key={s.table} className="flex items-center justify-between p-2 bg-white rounded-lg border border-red-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.table}</p>
                      <p className="text-sm font-bold text-gray-900">{s.count.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleClearTable(s.table)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={`Clear ${s.table}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-2 bg-red-100 rounded-lg flex items-start gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-tight text-red-700 font-bold uppercase">
                  Warning: Clearing tables is irreversible. Linked records will be deleted via CASCADE constraints.
                  Clear All uses the correct dependency order.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Steps */}
      {!loadingDb && (
        <div className="space-y-3">
          {/* Connector line visual cue */}
          <div className="relative">
            <div className="absolute left-[1.4rem] top-0 bottom-0 w-0.5 bg-gray-200 -z-10" />
            <div className="space-y-3">

              {/* Step 1 — Guest Import */}
              <StepCard
                step={1}
                title="Guest Import"
                subtitle="Import full guest profiles from AppSheet CSV — foundation for all other data"
                tables={['guests']}
                getCount={getCount}
                locked={false}
                fileRef="Concierge - Huespedes.csv"
              >
                <button
                  type="button"
                  onClick={() => setActiveModule('import-wizard')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open in Workspace
                </button>
              </StepCard>

              {/* Step 2 — Opera PMS Sync */}
              <StepCard
                step={2}
                title="Opera PMS Sync"
                subtitle="Sync reservations from Opera Cloud via Gmail or XML upload"
                tables={['reservations']}
                getCount={getCount}
                locked={false}
                recommendation={getCount('guests') === 0 ? 'Recommended: import guests first' : undefined}
                lastRun={latestSyncRun}
              >
                <div className="space-y-4">
                  {/* Auto sync trigger */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now (Gmail)'}
                    </button>
                    {syncStatus && (
                      <p className={`text-sm rounded-lg px-3 py-2 ${syncStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {syncStatus}
                      </p>
                    )}
                  </div>

                  {/* Sync logs */}
                  {syncLogs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Sync Runs</h4>
                      <div className="space-y-2">{syncLogs.map(renderSyncLog)}</div>
                    </div>
                  )}

                  {/* Manual upload */}
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs text-gray-400 mb-2">Or upload an XML file manually:</p>
                    <form onSubmit={handleOperaImport} className="flex items-center gap-3 flex-wrap">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xml"
                        required
                        className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                      <button
                        type="submit"
                        disabled={importing}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                      >
                        {importing ? 'Importing...' : 'Upload & Import'}
                      </button>
                      {importStatus && (
                        <p className={`text-sm rounded-lg px-3 py-2 ${importStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                          {importStatus}
                        </p>
                      )}
                    </form>
                  </div>
                </div>
              </StepCard>

              {/* Step 3 — Vendor Import */}
              <StepCard
                step={3}
                title="Vendor Import"
                subtitle="Import vendors from AppSheet CSV, preserving legacy vendor IDs"
                tables={['vendors']}
                getCount={getCount}
                locked={false}
                fileRef="Concierge - Vendedores.csv"
              >
                <button
                  type="button"
                  onClick={() => setActiveModule('vendor-import-wizard')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open in Workspace
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  After import, use the Vendors page to edit contact info or activate vendor users.
                </p>
              </StepCard>

              {/* Step 4 — Transfer Import */}
              <StepCard
                step={4}
                title="Transfer Import"
                subtitle="Import arrival and departure transfers from AppSheet CSV"
                tables={['transfers']}
                getCount={getCount}
                locked={getCount('guests') === 0}
                lockReason="Requires guests"
                fileRef="Concierge - Traslados Llegadas y Salidas.csv"
              >
                <button
                  type="button"
                  onClick={() => setActiveModule('transfer-wizard')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open in Workspace
                </button>
              </StepCard>

              {/* Step 5 — Tour Normalization */}
              <StepCard
                step={5}
                title="Tour Import & Normalization"
                subtitle="Import tour products and bookings from AppSheet CSV"
                tables={['tour_products', 'tour_bookings']}
                getCount={getCount}
                locked={false}
                fileRef="Concierge - Actividades.csv"
              >
                <button
                  type="button"
                  onClick={() => setActiveModule('tour-normalization')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open in Workspace
                </button>
              </StepCard>

              {/* Step 6 — Guest Normalization */}
              <StepCard
                step={6}
                title="Guest Normalization"
                subtitle="Detect and merge duplicate guest profiles, link orphaned reservations"
                tables={['guests']}
                getCount={getCount}
                locked={getCount('guests') === 0 && getCount('reservations') === 0}
                lockReason="Requires guests or reservations"
              >
                <button
                  type="button"
                  onClick={() => setActiveModule('guest-normalization')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open in Workspace
                </button>
              </StepCard>

              {/* Step 7 — Vendor Normalization */}
              <StepCard
                step={7}
                title="Vendor Normalization"
                subtitle="Merge duplicate vendor records and clean up vendor data"
                tables={['vendors']}
                getCount={getCount}
                locked={getCount('vendors') < 2}
                lockReason="Requires 2+ vendors"
              >
                <button
                  type="button"
                  onClick={() => setActiveModule('vendor-normalization')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open in Workspace
                </button>
              </StepCard>

            </div>
          </div>
        </div>
      )}

      {/* System Info + Messaging Channels (collapsed) */}
      <div className="space-y-3 pt-4">
        <button
          onClick={() => setShowSystemInfo(!showSystemInfo)}
          className="w-full flex items-center gap-3 text-left text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showSystemInfo ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          <span>System Info & Messaging Channels</span>
        </button>

        {showSystemInfo && (
          <div className="space-y-4">
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Messaging Channels</h2>
              <p className="text-sm text-gray-500 mb-4">
                Channels are pre-configured in the database. Manage them via the database directly or a future admin UI.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                {['Room Service', 'Guest Experience', 'Spa', 'Front Desk', 'Concierge'].map((ch) => (
                  <div key={ch} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                    {ch}
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Info</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Platform</dt>
                  <dd className="font-medium text-gray-900">Nayara BDT Ordering &amp; Concierge</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">PMS Integration</dt>
                  <dd className="font-medium text-gray-900">Opera Cloud (XML report)</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Database</dt>
                  <dd className="font-medium text-gray-900">PostgreSQL</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
