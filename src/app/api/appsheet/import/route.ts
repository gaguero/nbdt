import { NextRequest, NextResponse } from 'next/server';
import { importAppSheetCSV, type AppSheetTable } from '@/lib/appsheet/csv-import';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

const VALID_TABLES: AppSheetTable[] = [
  'guests', 'vendors', 'transfers', 'special_requests',
  'other_hotel_bookings', 'romantic_dinners', 'tour_bookings',
];

export async function POST(request: NextRequest) {
  try {
    console.log('[AppSheet API] POST /api/appsheet/import');

    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      console.error('[AppSheet API] No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      console.error('[AppSheet API] User role not authorized:', user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const table = formData.get('table') as string | null;

    console.log('[AppSheet API] Request:', { table, fileName: file?.name, fileSize: file?.size });

    if (!file) {
      console.error('[AppSheet API] No file in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!table || !VALID_TABLES.includes(table as AppSheetTable)) {
      console.error('[AppSheet API] Invalid table:', table);
      return NextResponse.json({ error: `Invalid table. Must be one of: ${VALID_TABLES.join(', ')}` }, { status: 400 });
    }

    const csvText = await file.text();
    console.log('[AppSheet API] CSV text loaded:', { size: csvText.length, lines: csvText.split('\n').length });

    const result = await importAppSheetCSV(csvText, table as AppSheetTable);
    console.log('[AppSheet API] Import result:', result);

    return NextResponse.json({ message: 'Import completed', result });
  } catch (error: any) {
    console.error('[AppSheet API] Unhandled error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
