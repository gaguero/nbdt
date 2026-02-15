'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  items: { name_en: string; quantity: number }[];
}

const STATUS_STAGES = ['pending', 'preparing', 'ready', 'picked_up', 'delivered'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Received',
  preparing: 'Being Prepared',
  ready: 'Ready for Pickup',
  picked_up: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-blue-600',
  preparing: 'text-yellow-600',
  ready: 'text-green-600',
  picked_up: 'text-purple-600',
  delivered: 'text-gray-500',
  cancelled: 'text-red-500',
};

export default function GuestOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    const guest = JSON.parse(localStorage.getItem('nayara_guest') || 'null');
    if (guest) setGuestName(guest.first_name || guest.guest_name || '');

    // Show the last order first from localStorage
    const lastOrder = JSON.parse(localStorage.getItem('nayara_last_order') || 'null');
    if (lastOrder) {
      setOrders([lastOrder]);
    }

    setLoading(false);

    // Poll for status updates on the last order
    if (lastOrder && !['delivered', 'cancelled'].includes(lastOrder.status)) {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/orders?guest_id=${guest?.guest_id}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          const updated = (data.orders || []).find((o: Order) => o.id === lastOrder.id);
          if (updated) localStorage.setItem('nayara_last_order', JSON.stringify(updated));
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {guestName && (
        <div className="bg-green-700 text-white text-center py-2 text-sm">
          {guestName}
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/guest/menu`)}
            className="text-green-700 font-medium text-sm hover:underline"
          >
            ← Menu
          </button>
          <h1 className="text-xl font-bold text-gray-900">Your Orders</h1>
        </div>

        {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}

        {!loading && orders.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-4">📋</div>
            <div>No orders yet.</div>
            <button
              onClick={() => router.push(`/${locale}/guest/menu`)}
              className="mt-4 text-green-700 font-medium hover:underline"
            >
              Order Something
            </button>
          </div>
        )}

        {orders.map((order) => {
          const stageIndex = STATUS_STAGES.indexOf(order.status);
          return (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-gray-900">{order.order_number}</div>
                <div className={`font-semibold text-sm ${STATUS_COLORS[order.status] || 'text-gray-600'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </div>
              </div>

              {/* Progress bar */}
              {order.status !== 'cancelled' && (
                <div className="flex gap-1">
                  {STATUS_STAGES.map((s, i) => (
                    <div
                      key={s}
                      className={`flex-1 h-2 rounded-full ${
                        i <= stageIndex ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Items summary */}
              <div className="text-sm text-gray-600">
                {order.items?.map((item, i) => (
                  <span key={i}>
                    {i > 0 ? ' · ' : ''}
                    {item.quantity}× {item.name_en}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-semibold text-gray-900">${order.total?.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
