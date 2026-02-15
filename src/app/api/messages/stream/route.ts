import { NextRequest } from 'next/server';
import { queryMany } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversation_id = searchParams.get('conversation_id');

  const encoder = new TextEncoder();
  let lastMessageId: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        try {
          let whereClause = 'WHERE 1=1';
          const params: any[] = [];
          let idx = 1;

          if (conversation_id) {
            whereClause += ` AND conversation_id = $${idx++}`;
            params.push(conversation_id);
          }
          if (lastMessageId) {
            whereClause += ` AND created_at > (SELECT created_at FROM messages WHERE id = $${idx++})`;
            params.push(lastMessageId);
          }

          const messages = await queryMany(
            `SELECT * FROM messages ${whereClause} ORDER BY created_at ASC LIMIT 50`,
            params
          );

          if (messages.length > 0) {
            lastMessageId = messages[messages.length - 1].id;
            send({ type: 'messages', messages });
          }
        } catch {
          send({ type: 'error', message: 'Failed to fetch messages' });
        }
      };

      await poll();
      const interval = setInterval(poll, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
