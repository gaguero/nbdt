'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TourProduct {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  type: string;
  duration_minutes: number;
  price_per_person: string;
  price_shared: string;
  price_private: string;
  booking_mode: string;
  location: string;
  images: string[];
  tags: string[];
  requires_boat: boolean;
  is_internal_operation: boolean;
  vendor_name: string;
}

const TYPE_LABELS: Record<string, { en: string; es: string }> = {
  tour: { en: 'Tour', es: 'Tour' },
  experience: { en: 'Experience', es: 'Experiencia' },
  restaurant: { en: 'Dining', es: 'Restaurante' },
  transfer: { en: 'Transfer', es: 'Traslado' },
};

export default function GuestToursPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isEs = locale === 'es';

  const [products, setProducts] = useState<TourProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/guest/tours')
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const types = ['all', ...new Set(products.map(p => p.type))];
  const filtered = filter === 'all' ? products : products.filter(p => p.type === filter);

  const formatDuration = (mins: number) => {
    if (!mins) return '';
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getPrice = (p: TourProduct) => {
    const price = p.price_per_person || p.price_shared || p.price_private;
    if (!price) return null;
    const num = parseFloat(price);
    if (isNaN(num)) return null;
    const label = p.price_per_person
      ? (isEs ? '/persona' : '/person')
      : p.price_shared
        ? (isEs ? ' compartido' : ' shared')
        : (isEs ? ' privado' : ' private');
    return `$${num.toFixed(0)}${label}`;
  };

  const getImage = (p: TourProduct) => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    if (imgs.length > 0 && typeof imgs[0] === 'string' && imgs[0].startsWith('http')) return imgs[0];
    return `https://placehold.co/400x240/1a2e12/FAFAF7?text=${encodeURIComponent((isEs ? p.name_es : p.name_en).slice(0, 20))}`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <h1 className="text-xl font-semibold mb-1" style={{ color: '#1a2e12', fontFamily: 'var(--font-gelasio), Georgia, serif', fontStyle: 'italic' }}>
        {isEs ? 'Tours y Actividades' : 'Tours & Activities'}
      </h1>
      <p className="text-sm mb-4" style={{ color: '#6B7F5A' }}>
        {isEs ? 'Descubra experiencias únicas' : 'Discover unique experiences'}
      </p>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
        {types.map(t => (
          <button key={t}
            onClick={() => setFilter(t)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={filter === t
              ? { background: '#4E5E3E', color: '#fff' }
              : { background: 'rgba(78,94,62,0.08)', color: '#6B7F5A', border: '1px solid rgba(78,94,62,0.15)' }
            }>
            {t === 'all'
              ? (isEs ? 'Todos' : 'All')
              : (TYPE_LABELS[t]?.[isEs ? 'es' : 'en'] || t)
            }
          </button>
        ))}
      </div>

      {/* Product cards */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>
          {isEs ? 'Cargando tours...' : 'Loading tours...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9CA3AF' }}>
          {isEs ? 'No hay tours disponibles' : 'No tours available'}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => (
            <Link key={p.id} href={`/${locale}/guest/tours/${p.id}`}
              className="block rounded-2xl overflow-hidden active:scale-[0.99]"
              style={{ background: '#fff', border: '1px solid #e5e2db', boxShadow: '0 2px 12px rgba(78,94,62,0.06)', transition: 'transform 0.1s' }}>
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                <img src={getImage(p)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {p.requires_boat && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: 'rgba(78,150,200,0.9)', color: '#fff' }}>
                      Boat
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    {TYPE_LABELS[p.type]?.[isEs ? 'es' : 'en'] || p.type}
                  </span>
                </div>

                {/* Duration badge */}
                {p.duration_minutes > 0 && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    {formatDuration(p.duration_minutes)}
                  </span>
                )}

                {/* Price */}
                {getPrice(p) && (
                  <div className="absolute bottom-3 right-3">
                    <span className="text-white font-semibold text-sm drop-shadow-lg">
                      {getPrice(p)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-base" style={{ color: '#1a2e12' }}>
                  {isEs ? (p.name_es || p.name_en) : (p.name_en || p.name_es)}
                </h3>
                {p.location && (
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    {p.location}
                  </p>
                )}
                <p className="text-sm mt-2 line-clamp-2" style={{ color: '#6B7F5A' }}>
                  {isEs ? (p.description_es || p.description_en || '') : (p.description_en || p.description_es || '')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
