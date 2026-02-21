import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { downloadAttachment, getContentDisposition } from '@/lib/email/attachment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const { content, filename, mimeType } = await downloadAttachment(parseInt(id));

    return new NextResponse(new Uint8Array(content), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': getContentDisposition(mimeType, filename),
        'Content-Length': String(content.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to preview attachment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
