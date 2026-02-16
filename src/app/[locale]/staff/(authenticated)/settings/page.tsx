'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { TrashIcon, ServerIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dbStats, setDbStats] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  const fetchDbStats = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/admin/db-manager');
      const data = await res.json();
      if (res.ok) setDbStats(data.stats || []);
    } catch (err) { console.error(err); }
    finally { setLoadingDb(false); }
  };

  useEffect(() => { fetchDbStats(); }, []);

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

      {/* Opera XML Import */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Opera PMS Import</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload the hourly Opera XML report to sync reservations and guest profiles.
        </p>
        <form onSubmit={handleOperaImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              XML Report File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xml"
              required
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Upload & Import'}
          </button>
          {importStatus && (
            <p className={`text-sm rounded-lg px-3 py-2 ${
              importStatus.startsWith('Error')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {importStatus}
            </p>
          )}
        </form>
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
