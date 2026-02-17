'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const SERVICE_TABS = [
  { key: 'transfers', label: 'Transfers', labelEs: 'Traslados' },
  { key: 'tours', label: 'Tours', labelEs: 'Tours' },
  { key: 'romantic_dinners', label: 'Romantic Dinners', labelEs: 'Cenas Románticas' },
];

const BILLING_STATUSES = [
  { key: 'all', label: 'All', labelEs: 'Todos' },
  { key: 'unbilled', label: 'Unbilled', labelEs: 'Sin facturar' },
  { key: 'billed', label: 'Billed', labelEs: 'Facturado' },
  { key: 'paid', label: 'Paid', labelEs: 'Pagado' },
];

export default function BillingPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [serviceType, setServiceType] = useState('transfers');
  const [billingStatus, setBillingStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchRows = () => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams({ service_type: serviceType, billing_status: billingStatus });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    fetch(`/api/billing?${params}`)
      .then(r => r.json())
      .then(d => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, [serviceType, billingStatus, dateFrom, dateTo]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };

  const markField = async (field: 'billed_date' | 'paid_date') => {
    if (!selected.size) return;
    setSaving(true);
    try {
      await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          service_type: serviceType,
          field,
          value: new Date().toISOString().split('T')[0],
        }),
      });
      fetchRows();
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Guest', 'Description', 'Pax', 'Status', 'Billed Date', 'Paid Date'];
    const csvRows = rows.map(r => [
      r.date ? r.date.split('T')[0] : '',
      r.guest_name ?? '',
      r.description ?? '',
      r.pax ?? '',
      r.status ?? '',
      r.billed_date ? r.billed_date.split('T')[0] : '',
      r.paid_date ? r.paid_date.split('T')[0] : '',
    ]);
    const csv = [headers, ...csvRows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-${serviceType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{ls('Billing Tracker', 'Seguimiento de Facturación')}</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
          <ArrowDownTrayIcon className="h-4 w-4" />
          {ls('Export CSV', 'Exportar CSV')}
        </button>
      </div>

      {/* Service tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SERVICE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setServiceType(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${serviceType === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {locale === 'es' ? t.labelEs : t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {BILLING_STATUSES.map(s => (
            <button key={s.key} onClick={() => setBillingStatus(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${billingStatus === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {locale === 'es' ? s.labelEs : s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center text-sm text-gray-600">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
          <span>–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-700 font-medium">{selected.size} {ls('selected', 'seleccionados')}</span>
          <button onClick={() => markField('billed_date')} disabled={saving}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 font-medium">
            {ls('Mark Billed Today', 'Marcar Facturado Hoy')}
          </button>
          <button onClick={() => markField('paid_date')} disabled={saving}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50 font-medium">
            {ls('Mark Paid Today', 'Marcar Pagado Hoy')}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
            {ls('Clear', 'Limpiar')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{ls('Loading...', 'Cargando...')}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">{ls('No records found', 'Sin registros')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 text-left w-10">
                  <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Date', 'Fecha')}</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Guest', 'Huésped')}</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Description', 'Descripción')}</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Pax', 'Pax')}</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Status', 'Estado')}</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Billed', 'Facturado')}</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{ls('Paid', 'Pagado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${selected.has(row.id) ? 'bg-blue-50' : ''}`}>
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded" />
                  </td>
                  <td className="p-3 text-gray-700 whitespace-nowrap">{row.date ? row.date.split('T')[0] : '—'}</td>
                  <td className="p-3 text-gray-900 font-medium">{row.guest_name ?? '—'}</td>
                  <td className="p-3 text-gray-600 max-w-[200px] truncate">{row.description ?? '—'}</td>
                  <td className="p-3 text-gray-600">{row.pax ?? '—'}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{row.status}</span>
                  </td>
                  <td className="p-3">
                    {row.billed_date ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{row.billed_date.split('T')[0]}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {row.paid_date ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">{row.paid_date.split('T')[0]}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
