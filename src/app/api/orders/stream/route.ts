import { NextRequest } from 'next/server';
import { queryMany } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get('station');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        try {
          let whereClause = `WHERE o.status NOT IN ('delivered', 'cancelled')`;
          const params: any[] = [];
          if (station) {
            whereClause += ` AND o.station = $1`;
            params.push(station);
          }

          const orders = await queryMany(
            `SELECT o.*, r.room_number
             FROM orders o
             LEFT JOIN rooms r ON o.room_id = r.id
             ${whereClause}
             ORDER BY o.created_at ASC`,
            params
          );

          for (const order of orders) {
            order.items = await queryMany(
              `SELECT oi.*, mi.name_en, mi.name_es FROM order_items oi
               LEFT JOIN menu_items mi ON oi.item_id = mi.id
               WHERE oi.order_id = $1`,
              [order.id]
            );
          }

          send({ type: 'orders', orders });
        } catch (error) {
          send({ type: 'error', message: 'Failed to fetch orders' });
        }
      };

      await poll();
      const interval = setInterval(poll, 5000);

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
