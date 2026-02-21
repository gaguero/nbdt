import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { sendEmail } from '@/lib/email/send-service';

export async function POST(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:send');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, fromAlias } = body;

    if (!accountId || !to?.length || !subject || !bodyText) {
      return NextResponse.json(
        { error: 'accountId, to, subject, and bodyText are required' },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      accountId,
      fromAlias,
      to,
      cc,
      bcc,
      subject,
      bodyHtml: bodyHtml || `<p>${bodyText.replace(/\n/g, '<br>')}</p>`,
      bodyText,
      sentByUserId: parseInt(authResult.userId),
    });

    return NextResponse.json({ success: true, gmailMessageId: result.gmailMessageId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
