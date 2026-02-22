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
    return `$${num.toFixed(0)}`;
  };

  const getPriceLabel = (p: TourProduct) => {
    if (p.price_per_person) return isEs ? '/persona' : '/person';
    if (p.price_shared) return isEs ? ' compartido' : ' shared';
    return isEs ? ' privado' : ' private';
  };

  const getImage = (p: TourProduct) => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    if (imgs.length > 0 && typeof imgs[0] === 'string' && imgs[0].length > 0) return imgs[0];
    return `https://placehold.co/600x400/1a2e12/AA8E67?text=${encodeURIComponent((isEs ? p.name_es : p.name_en).slice(0, 20))}`;
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: '#AA8E67', letterSpacing: '0.15em' }}>
          {isEs ? 'Descubra' : 'Discover'}
        </p>
        <h1 className="text-[22px] font-semibold" style={{ color: '#1a2e12', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          {isEs ? 'Tours y Experiencias' : 'Tours & Experiences'}
        </h1>
      </div>

      {/* Filter pills */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {types.map(t => (
            <button key={t}
              onClick={() => setFilter(t)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-medium tracking-wide transition-colors"
              style={filter === t
                ? { background: '#1a2e12', color: '#fff', letterSpacing: '0.02em' }
                : { background: 'rgba(170,142,103,0.08)', color: '#8B7D6B', border: '1px solid rgba(170,142,103,0.15)', letterSpacing: '0.02em' }
              }>
              {t === 'all'
                ? (isEs ? 'Todos' : 'All')
                : (TYPE_LABELS[t]?.[isEs ? 'es' : 'en'] || t)
              }
            </button>
          ))}
        </div>
      </div>

      {/* Product cards */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 rounded-full mx-auto mb-3 animate-pulse" style={{ background: 'rgba(170,142,103,0.15)' }} />
            <p className="text-sm" style={{ color: '#B0B0A8' }}>
              {isEs ? 'Cargando experiencias...' : 'Loading experiences...'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg className="h-12 w-12 mx-auto mb-3 opacity-15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#AA8E67">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm" style={{ color: '#B0B0A8' }}>
              {isEs ? 'No hay experiencias disponibles' : 'No experiences available'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((p, idx) => (
              <Link key={p.id} href={`/${locale}/guest/tours/${p.id}`}
                className="block rounded-[20px] overflow-hidden active:scale-[0.98]"
                style={{
                  background: '#fff',
                  boxShadow: '0 4px 24px rgba(14,26,9,0.06), 0 1px 3px rgba(14,26,9,0.04)',
                  transition: 'transform 0.15s',
                }}>
                {/* Image */}
                <div className="relative" style={{ aspectRatio: idx === 0 ? '16/10' : '16/9' }}>
                  <img src={getImage(p)} alt="" className="w-full h-full object-cover" />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(0deg, rgba(14,26,9,0.65) 0%, rgba(14,26,9,0.1) 40%, transparent 70%)',
                  }} />

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                      style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(8px)', letterSpacing: '0.06em' }}>
                      {TYPE_LABELS[p.type]?.[isEs ? 'es' : 'en'] || p.type}
                    </span>
                    {p.requires_boat && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide"
                        style={{ background: 'rgba(78,150,200,0.85)', color: '#fff', letterSpacing: '0.04em' }}>
                        Boat
                      </span>
                    )}
                  </div>

                  {/* Duration badge */}
                  {p.duration_minutes > 0 && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-medium"
                      style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                      {formatDuration(p.duration_minutes)}
                    </span>
                  )}

                  {/* Bottom overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-lg leading-tight drop-shadow-lg" style={{ fontFamily: 'Georgia, serif' }}>
                      {isEs ? (p.name_es || p.name_en) : (p.name_en || p.name_es)}
                    </h3>
                    {p.location && (
                      <p className="text-white/60 text-xs mt-1">{p.location}</p>
                    )}
                  </div>
                </div>

                {/* Info section */}
                <div className="p-4">
                  <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#6B7F5A' }}>
                    {isEs ? (p.description_es || p.description_en || '') : (p.description_en || p.description_es || '')}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-3"
                    style={{ borderTop: '1px solid rgba(170,142,103,0.1)' }}>
                    {/* Price */}
                    {getPrice(p) ? (
                      <div>
                        <span className="text-lg font-semibold" style={{ color: '#1a2e12' }}>
                          {getPrice(p)}
                        </span>
                        <span className="text-xs ml-0.5" style={{ color: '#B0B0A8' }}>
                          {getPriceLabel(p)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs italic" style={{ color: '#B0B0A8' }}>
                        {isEs ? 'Consultar precio' : 'Price on request'}
                      </span>
                    )}

                    {/* CTA */}
                    <span className="text-[11px] font-semibold tracking-wider uppercase px-4 py-2 rounded-full"
                      style={{ background: '#1a2e12', color: '#fff', letterSpacing: '0.06em' }}>
                      {isEs ? 'Ver Detalles' : 'View Details'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
