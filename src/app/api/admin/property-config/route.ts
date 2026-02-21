import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

const DEFAULT_SETTINGS = {
  brand: {
    colors: {
      bg: '#C8BDA8',
      surface: '#F2EBE0',
      elevated: '#E8DED2',
      gold: '#AA8E67',
      goldDark: '#9a7e55',
      sage: '#4E5E3E',
      forest: '#3a4a2e',
      terra: '#EC6C4B',
      charcoal: '#1A1A1A',
      sidebarBg: '#0E1A09',
      muted: '#6b7158',
      mutedDim: '#94907e',
      separator: 'rgba(124,142,103,0.12)',
    },
    fonts: {
      heading: 'Montserrat',
      headingWeight: '900',
      subheading: 'Gelasio',
      body: 'Figtree',
    },
  },
  rooms: {
    categories: [
      { name: 'Overwater', code: 'OW', total: 10 },
      { name: 'Garden', code: 'GD', total: 6 },
      { name: 'Beach', code: 'BC', total: 4 },
      { name: 'Suite', code: 'ST', total: 2 },
    ],
    totalUnits: 37,
  },
  dining: {
    locations: ['Beach', 'Overwater Deck', 'Jungle Platform', 'Room Terrace', 'Restaurant', 'Pool Area', 'Other'],
  },
  departments: ['concierge', 'housekeeping', 'maintenance', 'food_beverage', 'spa', 'front_desk', 'management'],
  weather: {
    enabled: true,
    provider: 'windy',
    zoom: 8,
  },
};

function deepMerge(defaults: any, overrides: any): any {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key]) && defaults[key] !== null) {
      result[key] = deepMerge(defaults[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const property = await queryOne(
      `SELECT id, name, code, timezone, currency, logo_url, location_lat, location_lon, location_label, settings FROM properties LIMIT 1`
    );

    if (!property) return NextResponse.json({ error: 'No property configured' }, { status: 404 });

    const mergedSettings = deepMerge(DEFAULT_SETTINGS, property.settings || {});

    return NextResponse.json({
      id: property.id,
      name: property.name,
      code: property.code,
      timezone: property.timezone,
      currency: property.currency,
      logoUrl: property.logo_url,
      locationLat: parseFloat(property.location_lat) || 9.341,
      locationLon: parseFloat(property.location_lon) || -82.253,
      locationLabel: property.location_label || 'Bocas del Toro',
      settings: mergedSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes((user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, timezone, currency, logoUrl, locationLat, locationLon, locationLabel, settings } = body;

    const property = await queryOne(
      `UPDATE properties SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        timezone = COALESCE($3, timezone),
        currency = COALESCE($4, currency),
        logo_url = COALESCE($5, logo_url),
        location_lat = COALESCE($6, location_lat),
        location_lon = COALESCE($7, location_lon),
        location_label = COALESCE($8, location_label),
        settings = COALESCE($9, settings),
        updated_at = NOW()
      WHERE id = (SELECT id FROM properties LIMIT 1)
      RETURNING *`,
      [name, code, timezone, currency, logoUrl, locationLat, locationLon, locationLabel, settings ? JSON.stringify(settings) : null]
    );

    return NextResponse.json({ property });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
