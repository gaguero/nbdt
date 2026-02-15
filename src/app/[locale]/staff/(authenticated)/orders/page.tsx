'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Order {
  id: string;
  order_number: string;
  room_number: string;
  guest_name: string;
  status: string;
  order_type: string;
  station: string;
  subtotal: number;
  tax: number;
  total: number;
  special_instructions: string;
  created_at: string;
  items: { name_en: string; quantity: number; subtotal: number }[];
}

const STATUS_OPTIONS = ['pending', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
const ORDER_TYPES = ['room_service', 'restaurant', 'bar', 'pool'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-green-100 text-green-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

export default function StaffOrdersPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [statusFilter, typeFilter]);

  async function loadOrders() {
    const q = new URLSearchParams();
    if (statusFilter) q.set('status', statusFilter);
    if (typeFilter) q.set('order_type', typeFilter);
    const res = await fetch(`/api/orders?${q}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      await loadOrders();
    } finally {
      setUpdating(null);
    }
  }

  function elapsed(createdAt: string): string {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return `${diff}m ago`;
  }

  const activeCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activeCount} active · ${revenue.toFixed(2)} total</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${locale}/kds/kitchen`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Kitchen KDS
          </Link>
          <Link
            href={`/${locale}/kds/bar`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Bar KDS
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {ORDER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-gray-900 text-lg">{order.order_number}</span>
                  <span className="text-gray-500">Room {order.room_number || '—'}</span>
                  {order.guest_name && (
                    <span className="text-gray-500">{order.guest_name}</span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                  <span className="text-xs text-gray-400">{elapsed(order.created_at)}</span>
                </div>

                <div className="text-sm text-gray-600">
                  {order.items.map((item, i) => (
                    <span key={i}>
                      {i > 0 ? ' · ' : ''}
                      {item.quantity}× {item.name_en}
                    </span>
                  ))}
                </div>

                {order.special_instructions && (
                  <div className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1 inline-block">
                    {order.special_instructions}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {order.order_type} {order.station ? `· ${order.station}` : ''} · ${order.total?.toFixed(2)}
                </div>
              </div>

              <select
                value={order.status}
                disabled={updating === order.id}
                onChange={(e) => updateStatus(order.id, e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && (
          <div className="text-center text-gray-400 py-12">No orders found.</div>
        )}
      </div>
    </div>
  );
}
