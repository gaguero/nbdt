import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const categories = await queryMany(
      `SELECT * FROM menu_categories WHERE is_active = true ORDER BY sort_order, name_en`
    );

    for (const cat of categories) {
      cat.subcategories = await queryMany(
        `SELECT * FROM menu_subcategories WHERE category_id = $1 AND is_active = true ORDER BY sort_order, name_en`,
        [cat.id]
      );
      for (const sub of cat.subcategories) {
        sub.items = await queryMany(
          `SELECT * FROM menu_items WHERE subcategory_id = $1 AND is_available = true ORDER BY sort_order, name_en`,
          [sub.id]
        );
        for (const item of sub.items) {
          item.modifiers = await queryMany(
            `SELECT * FROM item_modifiers WHERE item_id = $1 ORDER BY name_en`,
            [item.id]
          );
        }
      }
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
