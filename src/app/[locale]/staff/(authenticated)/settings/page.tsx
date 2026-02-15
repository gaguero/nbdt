'use client';

import { useState, useRef } from 'react';

const APPSHEET_TABLES = [
  { value: 'guests', label: 'Guests' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'transfers', label: 'Transfers' },
  { value: 'special_requests', label: 'Special Requests' },
  { value: 'other_hotel_bookings', label: 'Other Hotel Bookings' },
  { value: 'romantic_dinners', label: 'Romantic Dinners' },
  { value: 'tour_bookings', label: 'Tour Bookings' },
];

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvTable, setCsvTable] = useState('guests');
  const csvFileRef = useRef<HTMLInputElement>(null);

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
        console.log('✓ Opera import complete', data.result);
        if (errors && errors.length > 0) {
          console.warn('Import errors:', errors.slice(0, 20));
        }
      } else {
        setImportStatus(`Error: ${data.error}`);
        console.error('Opera import failed:', data.error);
      }
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();
    const file = csvFileRef.current?.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    setCsvStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', csvTable);

      const res = await fetch('/api/appsheet/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        const { created, updated, unchanged, total, errors } = data.result;
        const errCount = errors?.length ?? 0;
        const msg = `Import complete: ${total} rows — ${created} new, ${updated} updated, ${unchanged} unchanged${errCount > 0 ? `, ${errCount} errors` : ''}.`;
        setCsvStatus(msg);
        console.log('✓ AppSheet CSV import complete', data.result);
        if (errors && errors.length > 0) {
          console.warn('Import errors:', errors.slice(0, 20));
        }
      } else {
        setCsvStatus(`Error: ${data.error}`);
        console.error('AppSheet CSV import failed:', data.error);
      }
    } catch (err: any) {
      setCsvStatus(`Error: ${err.message}`);
    } finally {
      setCsvImporting(false);
      if (csvFileRef.current) csvFileRef.current.value = '';
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

      {/* AppSheet CSV Import */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">AppSheet Data Import</h2>
        <p className="text-sm text-gray-500 mb-4">
          Import historical data from AppSheet CSV exports. Select the target table, then upload the exported CSV file.
        </p>
        <form onSubmit={handleCsvImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Table
            </label>
            <select
              value={csvTable}
              onChange={e => setCsvTable(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {APPSHEET_TABLES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSV File
            </label>
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv"
              required
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
          <button
            type="submit"
            disabled={csvImporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {csvImporting ? 'Importing…' : 'Upload & Import CSV'}
          </button>
          {csvStatus && (
            <p className={`text-sm rounded-lg px-3 py-2 ${
              csvStatus.startsWith('Error')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {csvStatus}
            </p>
          )}
        </form>
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
