'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { statusColor } from '@/lib/statusColors';

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

  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-dim)' }}>
            <span className="nayara-badge nayara-badge-pending mr-2">{activeCount} active</span>
            <span className="font-mono" style={{ color: 'var(--gold)' }}>${revenue.toFixed(2)}</span> total revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/kds/kitchen`} className="nayara-btn nayara-btn-secondary text-xs">
            Kitchen KDS
          </Link>
          <Link href={`/${locale}/kds/bar`} className="nayara-btn nayara-btn-secondary text-xs">
            Bar KDS
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="nayara-input"
          style={{ width: 'auto' }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="nayara-input"
          style={{ width: 'auto' }}
        >
          <option value="">All Types</option>
          {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="h-7 w-7 border-2 border-t-transparent rounded-full mx-auto mb-2 animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>Loading orders…</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="nayara-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-lg" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--charcoal)' }}>
                    {order.order_number}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    Room {order.room_number || '—'}
                  </span>
                  {order.guest_name && (
                    <span className="text-sm" style={{ color: 'var(--muted-dim)' }}>{order.guest_name}</span>
                  )}
                  <span className={statusColor(order.status)}>{order.status}</span>
                  <span className="text-xs" style={{ color: 'var(--muted-dim)' }}>{elapsed(order.created_at)}</span>
                </div>

                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  {order.items.map((item, i) => (
                    <span key={i}>
                      {i > 0 ? ' · ' : ''}
                      {item.quantity}× {item.name_en}
                    </span>
                  ))}
                </div>

                {order.special_instructions && (
                  <div
                    className="text-sm rounded-lg px-2.5 py-1.5 inline-block"
                    style={{ background: 'rgba(170,142,103,0.12)', color: 'var(--gold-dark)' }}
                  >
                    {order.special_instructions}
                  </div>
                )}

                <div className="text-xs" style={{ color: 'var(--muted-dim)' }}>
                  {order.order_type}{order.station ? ` · ${order.station}` : ''} · <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>${order.total?.toFixed(2)}</span>
                </div>
              </div>

              <select
                value={order.status}
                disabled={updating === order.id}
                onChange={e => updateStatus(order.id, e.target.value)}
                className="nayara-input shrink-0"
                style={{ width: 'auto' }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && (
          <div className="nayara-card p-12 text-center">
            <p className="text-sm italic" style={{ color: 'var(--muted-dim)' }}>No orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
