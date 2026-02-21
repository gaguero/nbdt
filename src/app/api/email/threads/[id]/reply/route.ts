import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email/send-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:send');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const threadId = parseInt(id);

  try {
    const body = await request.json();
    const { to, cc, bodyHtml, bodyText, fromAlias, messageId } = body;

    if (!to?.length || !bodyText) {
      return NextResponse.json({ error: 'to and bodyText are required' }, { status: 400 });
    }

    // Load original thread and message
    const thread = await query(
      `SELECT et.gmail_thread_id, et.account_id, et.subject
       FROM email_threads et WHERE et.id = $1`,
      [threadId]
    );
    if (thread.rows.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get In-Reply-To and References from original message
    let inReplyTo: string | undefined;
    let references: string | undefined;

    if (messageId) {
      const origMsg = await query(
        'SELECT message_id_header, references_header FROM email_messages WHERE id = $1',
        [messageId]
      );
      if (origMsg.rows[0]) {
        inReplyTo = origMsg.rows[0].message_id_header || undefined;
        const existingRefs = origMsg.rows[0].references_header || '';
        references = existingRefs
          ? `${existingRefs} ${inReplyTo || ''}`.trim()
          : inReplyTo;
      }
    }

    const result = await sendEmail({
      accountId: thread.rows[0].account_id,
      fromAlias,
      to,
      cc,
      subject: thread.rows[0].subject?.startsWith('Re:')
        ? thread.rows[0].subject
        : `Re: ${thread.rows[0].subject || ''}`,
      bodyHtml: bodyHtml || `<p>${bodyText.replace(/\n/g, '<br>')}</p>`,
      bodyText,
      inReplyTo,
      references,
      threadId: thread.rows[0].gmail_thread_id,
      nbdtThreadId: threadId,
      sentByUserId: parseInt(authResult.userId),
    });

    return NextResponse.json({ success: true, gmailMessageId: result.gmailMessageId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send reply';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
