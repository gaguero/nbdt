import { NextRequest, NextResponse } from 'next/server';
import { importAppSheetCSV, type AppSheetTable } from '@/lib/appsheet/csv-import';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

const VALID_TABLES: AppSheetTable[] = [
  'guests', 'vendors', 'transfers', 'special_requests',
  'other_hotel_bookings', 'romantic_dinners', 'tour_bookings',
];

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const table = formData.get('table') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!table || !VALID_TABLES.includes(table as AppSheetTable)) {
      return NextResponse.json({ error: `Invalid table. Must be one of: ${VALID_TABLES.join(', ')}` }, { status: 400 });
    }

    const csvText = await file.text();
    const result = await importAppSheetCSV(csvText, table as AppSheetTable);

    return NextResponse.json({ message: 'Import completed', result });
  } catch (error: any) {
    console.error('AppSheet import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
