import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_ids } = body;

    if (!item_ids || item_ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const placeholders = item_ids.map((_: any, i: number) => `$${i + 1}`).join(',');
    const items = await queryMany(
      `SELECT mi.*, ms.name_en as subcategory_name_en, ms.name_es as subcategory_name_es
       FROM menu_items mi
       LEFT JOIN menu_subcategories ms ON mi.subcategory_id = ms.id
       WHERE mi.id IN (${placeholders})`,
      item_ids
    );

    for (const item of items) {
      item.modifiers = await queryMany(
        'SELECT * FROM item_modifiers WHERE item_id = $1',
        [item.id]
      );
    }

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
