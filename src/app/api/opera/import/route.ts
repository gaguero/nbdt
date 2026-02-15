import { NextRequest, NextResponse } from 'next/server';
import { importOperaXml } from '@/lib/opera/xml-import';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

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

    return NextResponse.json({ message: 'Import completed', result });
  } catch (error: any) {
    console.error('Opera import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
