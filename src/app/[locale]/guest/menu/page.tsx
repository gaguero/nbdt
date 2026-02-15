'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';

interface Modifier { id: string; name_en: string; name_es: string; price_add: number; is_required: boolean; }
interface MenuItem { id: string; name_en: string; name_es: string; description_en: string; price: number; image_url: string; dietary_tags: string[]; allergens: string[]; modifiers: Modifier[]; }
interface Subcategory { id: string; name_en: string; name_es: string; items: MenuItem[]; }
interface Category { id: string; name_en: string; name_es: string; subcategories: Subcategory[]; }

interface CartItem { item_id: string; name_en: string; quantity: number; unit_price: number; modifiers: Modifier[]; }

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

export default function GuestMenuPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<Modifier[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const room = searchParams.get('room');
    const existing = getGuest();

    async function identify() {
      if (room) {
        try {
          const res = await fetch(`/api/guest/identify?room=${room}`);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('nayara_guest', JSON.stringify(data));
            setGuest(data);
          }
        } catch {}
      } else if (existing) {
        setGuest(existing);
      }
    }

    identify();
    setCart(getCart());
  }, []);

  useEffect(() => {
    async function loadMenu() {
      const res = await fetch('/api/menu');
      const data = await res.json();
      const cats: Category[] = data.categories || [];
      setCategories(cats);
      if (cats.length > 0) setSelectedCat(cats[0].id);
      setLoading(false);
    }
    loadMenu();
  }, []);

  function addToCart(item: MenuItem, mods: Modifier[], quantity: number) {
    const modPrice = mods.reduce((sum, m) => sum + (m.price_add || 0), 0);
    const unitPrice = item.price + modPrice;
    const existing = cart.find(
      (c) => c.item_id === item.id && JSON.stringify(c.modifiers) === JSON.stringify(mods)
    );
    let updated: CartItem[];
    if (existing) {
      updated = cart.map((c) =>
        c.item_id === item.id && JSON.stringify(c.modifiers) === JSON.stringify(mods)
          ? { ...c, quantity: c.quantity + quantity }
          : c
      );
    } else {
      updated = [...cart, { item_id: item.id, name_en: item.name_en, quantity, unit_price: unitPrice, modifiers: mods }];
    }
    setCart(updated);
    saveCart(updated);
    setSelectedItem(null);
    setSelectedMods([]);
    setQty(1);
  }

  const activeCat = categories.find((c) => c.id === selectedCat);
  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guest welcome bar */}
      {guest && (
        <div className="bg-green-700 text-white text-center py-2 text-sm">
          Welcome, {guest.first_name || guest.guest_name} — Room {guest.room}
        </div>
      )}

      {/* Category tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex gap-1 px-4 overflow-x-auto py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCat === cat.id
                  ? 'bg-green-700 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {locale === 'es' ? cat.name_es : cat.name_en}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="text-center text-gray-400 py-8">Loading menu…</div>}

        {activeCat?.subcategories.map((sub) => (
          <section key={sub.id}>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              {locale === 'es' ? sub.name_es : sub.name_en}
            </h2>
            <div className="space-y-2">
              {sub.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setSelectedMods([]); setQty(1); }}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{locale === 'es' ? item.name_es : item.name_en}</div>
                    {item.description_en && (
                      <div className="text-sm text-gray-500 truncate">{item.description_en}</div>
                    )}
                    {item.dietary_tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.dietary_tags.map((tag) => (
                          <span key={tag} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 shrink-0">
                    <span className="font-semibold text-gray-900">${item.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-20">
          <button
            onClick={() => router.push(`/${locale}/guest/cart`)}
            className="w-full bg-green-700 text-white rounded-2xl py-4 px-6 font-semibold text-lg flex items-center justify-between shadow-lg"
          >
            <span className="bg-white/20 text-white text-sm font-bold w-7 h-7 rounded-lg flex items-center justify-center">
              {cartCount}
            </span>
            <span>View Cart</span>
            <span>${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Item detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedItem.name_en}</h3>
            {selectedItem.description_en && (
              <p className="text-gray-500 text-sm mb-4">{selectedItem.description_en}</p>
            )}

            {selectedItem.modifiers.length > 0 && (
              <div className="mb-4">
                <div className="font-medium text-gray-800 mb-2 text-sm">Customizations</div>
                {selectedItem.modifiers.map((mod) => (
                  <label key={mod.id} className="flex items-center gap-3 py-2 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMods.some((m) => m.id === mod.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedMods([...selectedMods, mod]);
                        else setSelectedMods(selectedMods.filter((m) => m.id !== mod.id));
                      }}
                      className="rounded w-4 h-4"
                    />
                    <span className="flex-1 text-sm">{mod.name_en}</span>
                    {mod.price_add > 0 && (
                      <span className="text-sm text-gray-500">+${mod.price_add.toFixed(2)}</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-50"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedItem(null); setSelectedMods([]); }}
                className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => addToCart(selectedItem, selectedMods, qty)}
                className="flex-1 bg-green-700 text-white rounded-xl py-3 text-sm font-semibold hover:bg-green-800"
              >
                Add {qty} · ${((selectedItem.price + selectedMods.reduce((s, m) => s + (m.price_add || 0), 0)) * qty).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
