import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'tours:products:manage');
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 5MB' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${random}.${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadsDir, filename), buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({ url, filename }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
