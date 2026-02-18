'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { TrashIcon, ServerIcon, ExclamationTriangleIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dbStats, setDbStats] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<{ id: string; section: 'created' | 'updated' | 'errors' } | null>(null);

  const fetchDbStats = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/admin/db-manager');
      const data = await res.json();
      if (res.ok) setDbStats(data.stats || []);
    } catch (err) { console.error(err); }
    finally { setLoadingDb(false); }
  };

  const fetchSyncLogs = async () => {
    const res = await fetch('/api/admin/opera-sync');
    if (res.ok) { const d = await res.json(); setSyncLogs(d.logs ?? []); }
  };

  useEffect(() => { fetchDbStats(); fetchSyncLogs(); }, []);

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
    } catch (err) { alert('Failed to clear table'); }
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

      const res = await fetch('/api/opera/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        const { created: added, updated, unchanged, total, errors } = data.result;
        const errorCount = errors?.length ?? 0;
        const msg = `Import complete: ${total} records — ${added} new, ${updated} updated, ${unchanged} unchanged${errorCount > 0 ? `, ${errorCount} errors` : ''}.`;
        setImportStatus(msg);
        if (errors && errors.length > 0) console.warn('Import errors:', errors.slice(0, 20));
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Opera PMS — Auto Sync + Manual Upload */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Opera PMS Sync</h2>
          <p className="text-sm text-gray-500">
            Reservations sync automatically every hour from the <code className="bg-gray-100 px-1 rounded text-xs">Opera_revs_update</code> Gmail label.
            You can also trigger a manual sync or upload an XML file directly.
          </p>
        </div>

        {/* Auto sync trigger */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now (Gmail)'}
          </button>
          {syncStatus && (
            <p className={`text-sm rounded-lg px-3 py-2 ${syncStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {syncStatus}
            </p>
          )}
        </div>

        {/* Recent sync log */}
        {syncLogs.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Sync Runs</h3>
            <div className="space-y-2">
              {syncLogs.map((log: any) => {
                const createdList: any[] = Array.isArray(log.created_details) ? log.created_details : [];
                const updatedList: any[] = Array.isArray(log.updated_details) ? log.updated_details : [];
                const errorsList: string[] = Array.isArray(log.errors) ? log.errors : [];
                const isExpanded = expandedLog?.id === log.id;
                const expandedSection = isExpanded ? expandedLog?.section : null;

                const toggle = (section: 'created' | 'updated' | 'errors') => {
                  if (isExpanded && expandedSection === section) {
                    setExpandedLog(null);
                  } else {
                    setExpandedLog({ id: log.id, section });
                  }
                };

                const hasErrors = errorsList.length > 0;

                return (
                  <div key={log.id} className="rounded-lg border border-gray-100 overflow-hidden">
                    {/* Header row */}
                    <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-2 flex-wrap">
                      {hasErrors
                        ? <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        : <CheckCircleIcon className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                      <span className="text-gray-400 font-mono">{new Date(log.synced_at).toLocaleString()}</span>
                      <span className="text-gray-400 capitalize">[{log.triggered_by}]</span>
                      {log.triggered_by !== 'upload' && (
                        <span className="text-gray-500">{log.emails_found} email(s) · {log.xmls_processed} XML(s)</span>
                      )}
                      {/* Clickable new count */}
                      {createdList.length > 0 ? (
                        <button
                          onClick={() => toggle('created')}
                          className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expandedSection === 'created' ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {createdList.length} new
                        </button>
                      ) : (
                        <span className="text-gray-400">0 new</span>
                      )}
                      {/* Clickable updated count */}
                      {updatedList.length > 0 ? (
                        <button
                          onClick={() => toggle('updated')}
                          className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expandedSection === 'updated' ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                        >
                          {updatedList.length} updated
                        </button>
                      ) : (
                        <span className="text-gray-400">0 updated</span>
                      )}
                      {/* Clickable error count */}
                      {errorsList.length > 0 && (
                        <button
                          onClick={() => toggle('errors')}
                          className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${expandedSection === 'errors' ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {errorsList.length} error(s)
                        </button>
                      )}
                    </div>

                    {/* Detail panel */}
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
                          {errorsList.map((e: string, i: number) => (
                            <p key={i} className="text-xs text-red-700 font-mono break-all">{e}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual file upload (fallback) */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-400 mb-3">Or upload an XML file manually:</p>
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
              {importing ? 'Importing…' : 'Upload & Import'}
            </button>
            {importStatus && (
              <p className={`text-sm rounded-lg px-3 py-2 ${importStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {importStatus}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* Imports & Normalization */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Imports &amp; Normalization</h2>
        <p className="text-sm text-gray-500 mb-5">
          All data import wizards and normalization tools for historical AppSheet data.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Link href="/staff/import-wizard" className="group flex flex-col gap-2 p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-lg">👤</span>
              <span className="font-semibold text-blue-800">Guest Import Wizard</span>
            </div>
            <p className="text-xs text-blue-600">
              Analyze CSV, detect duplicates, infer profile types, and review before importing.
            </p>
          </Link>

          <Link href="/staff/transfer-wizard" className="group flex flex-col gap-2 p-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-indigo-600 text-lg">🚗</span>
              <span className="font-semibold text-indigo-800">Transfer Import Wizard</span>
            </div>
            <p className="text-xs text-indigo-600">
              Validate dates, match guests and vendors, fix invalid rows before importing.
            </p>
          </Link>

          <Link href="/staff/vendor-normalization" className="group flex flex-col gap-2 p-4 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 text-lg">🏢</span>
              <span className="font-semibold text-orange-800">Vendor Normalization</span>
            </div>
            <p className="text-xs text-orange-600">
              Merge duplicate vendor records and clean up vendor data.
            </p>
          </Link>

          <Link href="/staff/tour-normalization" className="group flex flex-col gap-2 p-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-purple-600 text-lg">🗺️</span>
              <span className="font-semibold text-purple-800">Tour Normalization</span>
            </div>
            <p className="text-xs text-purple-600">
              Import and normalize tour booking records from AppSheet CSV exports.
            </p>
          </Link>

          <Link href="/staff/guest-normalization" className="group flex flex-col gap-2 p-4 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-teal-600 text-lg">🔀</span>
              <span className="font-semibold text-teal-800">Guest Normalization</span>
            </div>
            <p className="text-xs text-teal-600">
              Detect and merge duplicate guest profiles, link orphaned reservations.
            </p>
          </Link>

        </div>
      </section>

      {/* Database Manager (Admin Only) */}
      <section className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <ServerIcon className="h-6 w-6" />
          <h2 className="text-lg font-black uppercase tracking-tight">Database Manager</h2>
        </div>
        <p className="text-sm text-gray-500">
          Monitor record counts across all operational tables. Use these controls to clear data during development.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loadingDb ? (
            <div className="col-span-2 text-center py-4 text-gray-400 animate-pulse">Loading stats...</div>
          ) : dbStats.map((s) => (
            <div key={s.table} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.table}</p>
                <p className="text-lg font-black text-gray-900">{s.count.toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleClearTable(s.table)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={`Clear ${s.table}`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight text-red-700 font-bold uppercase">
            Warning: Clearing tables is irreversible. Linked records will be deleted via CASCADE constraints.
          </p>
        </div>
      </section>

      {/* Conversation Channels */}
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

      {/* System Info */}
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
  );
}
