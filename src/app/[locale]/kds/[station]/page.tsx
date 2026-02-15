'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

interface OrderItem {
  id: string;
  name_en: string;
  name_es: string;
  quantity: number;
  modifiers: any[];
  station: string;
  item_status: string;
}

interface Order {
  id: string;
  order_number: string;
  room_number: string;
  guest_name: string;
  status: string;
  order_type: string;
  special_instructions: string;
  items: OrderItem[];
  created_at: string;
}

const STATUS_FLOW: Record<string, string> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-green-500 bg-green-950',
  preparing: 'border-yellow-500 bg-yellow-950',
  ready: 'border-blue-500 bg-blue-950',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-green-600',
  preparing: 'bg-yellow-500',
  ready: 'bg-blue-600',
};

function elapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isUrgent(createdAt: string): boolean {
  const diff = (Date.now() - new Date(createdAt).getTime()) / 60000;
  return diff > 15;
}

function PinLogin({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/kds-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      onSuccess();
    } else {
      setError('Invalid PIN');
      setPin('');
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-10 w-80 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">KDS Login</h1>
        <p className="text-gray-400 mb-8">Enter your 4-digit PIN</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-gray-700 text-white text-center text-3xl tracking-widest rounded-xl px-4 py-4 border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="••••"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-lg font-semibold disabled:opacity-40"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

export default function KDSStationPage() {
  const params = useParams();
  const station = params.station as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tick, setTick] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const prevOrderIds = useRef<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    const statuses = ['pending', 'preparing', 'ready'];
    const query = statuses.map((s) => `status=${s}`).join('&');
    const res = await fetch(`/api/orders?station=${station}&${query}`);
    if (!res.ok) return;
    const data = await res.json();
    const incoming: Order[] = data.orders || [];

    // Detect new orders and play sound
    const newIds = new Set(incoming.map((o) => o.id));
    const hasNew = incoming.some((o) => !prevOrderIds.current.has(o.id));
    if (hasNew && prevOrderIds.current.size > 0) {
      playBeep();
    }
    prevOrderIds.current = newIds;
    setOrders(incoming);
  }, [station]);

  function playBeep() {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  useEffect(() => {
    if (!authenticated) return;
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [authenticated, loadOrders]);

  // Timer tick every second for elapsed display
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function advanceOrder(order: Order) {
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status: nextStatus }),
    });
    await loadOrders();
  }

  if (!authenticated) {
    return <PinLogin onSuccess={() => setAuthenticated(true)} />;
  }

  const stationLabel = station.charAt(0).toUpperCase() + station.slice(1);
  const activeOrders = orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status));

  return (
    <div className="h-screen flex flex-col bg-gray-900 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xl font-bold text-white">{stationLabel} Station</span>
        </div>
        <div className="text-gray-400 text-sm">
          {activeOrders.length} active {activeOrders.length === 1 ? 'order' : 'orders'} · auto-refresh 10s
        </div>
      </div>

      {/* Orders grid */}
      {activeOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-6xl mb-4">✓</div>
            <div className="text-2xl font-medium">All caught up</div>
            <div className="text-gray-500 mt-2">No active orders</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
            {activeOrders.map((order) => {
              const urgent = isUrgent(order.created_at);
              const nextStatus = STATUS_FLOW[order.status];
              return (
                <div
                  key={order.id}
                  onClick={() => advanceOrder(order)}
                  className={`rounded-2xl border-2 p-4 cursor-pointer transition-all active:scale-95 hover:brightness-110 ${
                    STATUS_COLORS[order.status] || 'border-gray-500 bg-gray-800'
                  } ${urgent ? 'animate-pulse' : ''}`}
                >
                  {/* Order header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-2xl font-bold text-white leading-none">
                        {order.room_number || '—'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{order.order_number}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_BADGE[order.status] || 'bg-gray-600'}`}>
                        {order.status.toUpperCase()}
                      </span>
                      <div className={`text-sm mt-1 font-mono ${urgent ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                        {elapsed(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-white font-bold text-base shrink-0">{item.quantity}×</span>
                        <div>
                          <div className="text-white text-sm leading-tight">{item.name_en}</div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-gray-400 text-xs">
                              {item.modifiers.map((m: any) => m.name || m).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Special instructions */}
                  {order.special_instructions && (
                    <div className="text-xs text-yellow-300 bg-yellow-900/30 rounded-lg px-2 py-1 mb-3">
                      {order.special_instructions}
                    </div>
                  )}

                  {/* Tap to advance */}
                  {nextStatus && (
                    <div className="text-center text-xs text-gray-500 border-t border-gray-700 pt-2 mt-2">
                      Tap → {nextStatus}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
