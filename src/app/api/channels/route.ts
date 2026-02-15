import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const channels = await queryMany(
      `SELECT id, name, display_name_en, display_name_es
       FROM conversation_channels
       WHERE is_active = true
       ORDER BY sort_order, display_name_en`
    );
    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
