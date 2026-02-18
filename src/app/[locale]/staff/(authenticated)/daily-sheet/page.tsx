'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { localDateString } from '@/lib/dates';

export default function DailySheetPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(localDateString(d));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/reservations?date_from=${selectedDate}&date_to=${selectedDate}&filter=arrivals`).then(r => r.json()),
      fetch(`/api/reservations?date_from=${selectedDate}&date_to=${selectedDate}&filter=departures`).then(r => r.json()),
      fetch(`/api/transfers?date_from=${selectedDate}&date_to=${selectedDate}`).then(r => r.json()),
      fetch(`/api/tour-bookings?date_from=${selectedDate}&date_to=${selectedDate}`).then(r => r.json()),
      fetch(`/api/romantic-dinners?date_from=${selectedDate}&date_to=${selectedDate}`).then(r => r.json()),
      fetch(`/api/special-requests?status=pending`).then(r => r.json()),
    ]).then(([arrivalsData, departuresData, transfersData, toursData, dinnersData, requestsData]) => {
      setData({
        arrivals: arrivalsData.reservations ?? [],
        departures: departuresData.reservations ?? [],
        transfers: transfersData.transfers ?? [],
        tours: toursData.tour_bookings ?? [],
        dinners: dinnersData.romantic_dinners ?? [],
        requests: requestsData.special_requests ?? [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedDate]);

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
    locale === 'es' ? 'es-CR' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { font-size: 11px; }
          h1 { font-size: 18px; }
          h2 { font-size: 13px; }
          table { page-break-inside: avoid; }
          .print-section { page-break-inside: avoid; margin-bottom: 16px; }
        }
      `}</style>

      <div className="p-6 space-y-6 print-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setSelectedDate(localDateString()); }}
              className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 font-medium"
            >
              {ls('Today', 'Hoy')}
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900"
          >
            <PrinterIcon className="h-4 w-4" />
            {ls('Print', 'Imprimir')}
          </button>
        </div>

        {/* Print header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Nayara BDT — {ls('Daily Operations Sheet', 'Hoja de Operaciones Diarias')}</h1>
          <p className="text-gray-500 mt-1 capitalize">{dateLabel}</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">{ls('Loading...', 'Cargando...')}</div>
        ) : (
          <>
            {/* Arrivals */}
            <Section title={ls('Arrivals', 'Llegadas')} count={data.arrivals?.length}>
              {data.arrivals?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-2 text-left">{ls('Guest', 'Huésped')}</th>
                    <th className="p-2 text-left">{ls('Room', 'Habitación')}</th>
                    <th className="p-2 text-left">{ls('Nights', 'Noches')}</th>
                    <th className="p-2 text-left">{ls('Departure', 'Salida')}</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {data.arrivals.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-2 font-medium">{r.guest_name ?? r.full_name ?? '—'}</td>
                        <td className="p-2">{r.room_number ?? r.room ?? '—'}</td>
                        <td className="p-2">{r.nights ?? '—'}</td>
                        <td className="p-2">{r.departure ? r.departure.split('T')[0] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty ls={ls} />}
            </Section>

            {/* Departures */}
            <Section title={ls('Departures', 'Salidas')} count={data.departures?.length}>
              {data.departures?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-2 text-left">{ls('Guest', 'Huésped')}</th>
                    <th className="p-2 text-left">{ls('Room', 'Habitación')}</th>
                    <th className="p-2 text-left">{ls('Arrival', 'Llegada')}</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {data.departures.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-2 font-medium">{r.guest_name ?? r.full_name ?? '—'}</td>
                        <td className="p-2">{r.room_number ?? r.room ?? '—'}</td>
                        <td className="p-2">{r.arrival ? r.arrival.split('T')[0] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty ls={ls} />}
            </Section>

            {/* Transfers */}
            <Section title={ls('Transfers', 'Traslados')} count={data.transfers?.length}>
              {data.transfers?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-2 text-left">{ls('Time', 'Hora')}</th>
                    <th className="p-2 text-left">{ls('Guest', 'Huésped')}</th>
                    <th className="p-2 text-left">{ls('Route', 'Ruta')}</th>
                    <th className="p-2 text-left">{ls('Vendor', 'Proveedor')}</th>
                    <th className="p-2 text-left">{ls('Pax', 'Pax')}</th>
                    <th className="p-2 text-left">{ls('Status', 'Estado')}</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {[...data.transfers].sort((a: any, b: any) => (a.time || '').localeCompare(b.time || '')).map((t: any) => (
                      <tr key={t.id}>
                        <td className="p-2 font-medium whitespace-nowrap">{t.time?.slice(0, 5) ?? '—'}</td>
                        <td className="p-2">{t.guest_name ?? '—'}</td>
                        <td className="p-2 text-xs">{t.origin} → {t.destination}</td>
                        <td className="p-2 text-xs">{t.vendor_name ?? '—'}</td>
                        <td className="p-2">{t.num_passengers ?? '—'}</td>
                        <td className="p-2"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{t.guest_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty ls={ls} />}
            </Section>

            {/* Tours */}
            <Section title={ls('Tours & Activities', 'Tours y Actividades')} count={data.tours?.length}>
              {data.tours?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-2 text-left">{ls('Time', 'Hora')}</th>
                    <th className="p-2 text-left">{ls('Guest', 'Huésped')}</th>
                    <th className="p-2 text-left">{ls('Tour', 'Tour')}</th>
                    <th className="p-2 text-left">{ls('Mode', 'Modalidad')}</th>
                    <th className="p-2 text-left">{ls('Pax', 'Pax')}</th>
                    <th className="p-2 text-left">{ls('Status', 'Estado')}</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {data.tours.map((t: any) => (
                      <tr key={t.id}>
                        <td className="p-2 font-medium whitespace-nowrap">{t.start_time?.slice(0, 5) ?? '—'}</td>
                        <td className="p-2">{t.guest_name ?? '—'}</td>
                        <td className="p-2">{t.name_en ?? t.product_name ?? '—'}</td>
                        <td className="p-2 text-xs">{t.booking_mode ?? '—'}</td>
                        <td className="p-2">{t.num_guests ?? '—'}</td>
                        <td className="p-2"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{t.guest_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty ls={ls} />}
            </Section>

            {/* Romantic Dinners */}
            <Section title={ls('Romantic Dinners', 'Cenas Románticas')} count={data.dinners?.length}>
              {data.dinners?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-2 text-left">{ls('Time', 'Hora')}</th>
                    <th className="p-2 text-left">{ls('Guest', 'Huésped')}</th>
                    <th className="p-2 text-left">{ls('Location', 'Ubicación')}</th>
                    <th className="p-2 text-left">{ls('Pax', 'Pax')}</th>
                    <th className="p-2 text-left">{ls('Status', 'Estado')}</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {[...data.dinners].sort((a: any, b: any) => (a.time || '').localeCompare(b.time || '')).map((d: any) => (
                      <tr key={d.id}>
                        <td className="p-2 font-medium whitespace-nowrap">{d.time?.slice(0, 5) ?? '—'}</td>
                        <td className="p-2">{d.guest_name ?? '—'}</td>
                        <td className="p-2">{d.location ?? '—'}</td>
                        <td className="p-2">{d.num_guests ?? '—'}</td>
                        <td className="p-2"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{d.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty ls={ls} />}
            </Section>

            {/* Special Requests */}
            <Section title={ls('Pending Special Requests', 'Solicitudes Pendientes')} count={data.requests?.length}>
              {data.requests?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-2 text-left">{ls('Dept', 'Depto')}</th>
                    <th className="p-2 text-left">{ls('Guest', 'Huésped')}</th>
                    <th className="p-2 text-left">{ls('Request', 'Solicitud')}</th>
                    <th className="p-2 text-left">{ls('Priority', 'Prioridad')}</th>
                    <th className="p-2 text-left">{ls('Assigned To', 'Asignado')}</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {data.requests.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-2 text-xs capitalize">{r.department?.replace('_', ' ')}</td>
                        <td className="p-2">{r.guest_name ?? '—'}</td>
                        <td className="p-2 max-w-[250px] truncate">{r.request}</td>
                        <td className="p-2 text-xs">{r.priority ?? 'normal'}</td>
                        <td className="p-2 text-xs">{r.assigned_to_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty ls={ls} />}
            </Section>
          </>
        )}
      </div>
    </>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="print-section border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
        <h2 className="font-bold text-sm uppercase tracking-wider">{title}</h2>
        {count !== undefined && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{count}</span>}
      </div>
      <div className="bg-white">
        {children}
      </div>
    </div>
  );
}

function Empty({ ls }: { ls: (en: string, es: string) => string }) {
  return (
    <p className="p-4 text-center text-gray-400 text-sm italic">{ls('None for this date', 'Ninguno para esta fecha')}</p>
  );
}
