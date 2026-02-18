import { NextRequest, NextResponse } from 'next/server';
import { importOperaXml } from '@/lib/opera/xml-import';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lastSync = await queryOne(
      'SELECT MAX(last_synced_at) as "lastSync" FROM reservations'
    );

    return NextResponse.json(lastSync || { lastSync: null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const xmlContent = await file.text();
    const result = await importOperaXml(xmlContent);

    await query(
      `INSERT INTO opera_sync_log
         (emails_found, xmls_processed, reservations_created, reservations_updated, errors, triggered_by, created_details, updated_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        0, 1,
        result.created,
        result.updated,
        JSON.stringify(result.errors),
        'upload',
        JSON.stringify(result.createdRecords),
        JSON.stringify(result.updatedRecords),
      ]
    );

    return NextResponse.json({ message: 'Import completed', result });
  } catch (error: any) {
    console.error('Opera import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
