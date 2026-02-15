'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface CartItem { item_id: string; name_en: string; quantity: number; unit_price: number; modifiers: { name_en: string; price_add: number }[]; }
interface GuestInfo { guest_name: string; first_name: string; room: string; guest_id: string; reservation_id: string; room_id: string; property_id: string; }

function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('nayara_cart') || '[]'); } catch { return []; }
}
function saveCart(cart: CartItem[]) {
  localStorage.setItem('nayara_cart', JSON.stringify(cart));
}
function getGuest(): GuestInfo | null {
  try { return JSON.parse(localStorage.getItem('nayara_guest') || 'null'); } catch { return null; }
}

export default function GuestCartPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [instructions, setInstructions] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCart(getCart());
    setGuest(getGuest());
  }, []);

  function updateQty(index: number, qty: number) {
    if (qty < 1) {
      const updated = cart.filter((_, i) => i !== index);
      setCart(updated);
      saveCart(updated);
    } else {
      const updated = cart.map((item, i) => i === index ? { ...item, quantity: qty } : item);
      setCart(updated);
      saveCart(updated);
    }
  }

  async function placeOrder() {
    if (!guest) {
      setError('We could not identify your room. Please scan the QR code again.');
      return;
    }
    if (cart.length === 0) return;

    setPlacing(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: guest.room_id,
          property_id: guest.property_id,
          guest_id: guest.guest_id,
          reservation_id: guest.reservation_id,
          order_type: 'room_service',
          special_instructions: instructions,
          items: cart.map((item) => ({
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            modifiers: item.modifiers,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to place order');
        return;
      }

      const data = await res.json();
      localStorage.removeItem('nayara_cart');
      localStorage.setItem('nayara_last_order', JSON.stringify(data.order));
      router.push(`/${locale}/guest/orders`);
    } finally {
      setPlacing(false);
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-50">
      {guest && (
        <div className="bg-green-700 text-white text-center py-2 text-sm">
          {guest.first_name || guest.guest_name} — Room {guest.room}
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/guest/menu`)}
            className="text-green-700 font-medium text-sm hover:underline"
          >
            ← Back to Menu
          </button>
          <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
        </div>

        {cart.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-4">🛒</div>
            <div>Your cart is empty.</div>
            <button
              onClick={() => router.push(`/${locale}/guest/menu`)}
              className="mt-4 text-green-700 font-medium hover:underline"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {cart.map((item, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{item.name_en}</div>
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {item.modifiers.map((m) => m.name_en).join(', ')}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">${item.unit_price.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(i, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-base font-medium hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(i, item.quantity + 1)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-base font-medium hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <span className="font-semibold text-gray-900">${(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Allergies, dietary needs, special requests…"
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (13%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={placing}
              className="w-full bg-green-700 text-white rounded-2xl py-4 font-semibold text-lg disabled:opacity-50 hover:bg-green-800"
            >
              {placing ? 'Placing Order…' : `Place Order · $${total.toFixed(2)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
