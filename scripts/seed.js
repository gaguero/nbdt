'use strict';

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Seeding database...');

    // 1. Property
    console.log('\nInserting property...');
    const propRes = await pool.query(
      `INSERT INTO properties (name, code, timezone, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, code`,
      ['Nayara Bocas del Toro', 'NAYARA_BDT', 'America/Panama', 'USD']
    );
    const property = propRes.rows[0];
    console.log('Property:', property.name, '| ID:', property.id);

    // 2. Rooms 101-120
    console.log('\nInserting rooms...');
    const roomTypes = ['Standard', 'Deluxe', 'Suite'];
    let roomCount = 0;
    for (let i = 101; i <= 120; i++) {
      const roomType = roomTypes[Math.floor((i - 101) / 7) % 3];
      await pool.query(
        `INSERT INTO rooms (property_id, room_number, room_type, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (property_id, room_number) DO NOTHING`,
        [property.id, i.toString(), roomType]
      );
      roomCount++;
    }
    console.log('Rooms created:', roomCount);

    // 3. Admin user
    console.log('\nCreating admin user...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const userRes = await pool.query(
      `INSERT INTO staff_users (property_id, email, password_hash, first_name, last_name, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         is_active = true
       RETURNING id, email, role`,
      [
        property.id,
        'admin@nayarabdt.com',
        passwordHash,
        'Admin',
        'User',
        'admin',
        ['view_orders', 'manage_orders', 'manage_menu', 'manage_bookings', 'manage_users'],
      ]
    );
    const user = userRes.rows[0];
    console.log('Admin user:', user.email, '| Role:', user.role);

    // 4. Menu categories
    console.log('\nInserting menu categories...');
    const categories = [
      { name_en: 'Food & Drink', name_es: 'Comida y Bebida', slug: 'food-drink', sort_order: 1 },
      { name_en: 'Leisure', name_es: 'Ocio', slug: 'leisure', sort_order: 2 },
      { name_en: 'Spa', name_es: 'Spa', slug: 'spa', sort_order: 3 },
    ];
    for (const cat of categories) {
      await pool.query(
        `INSERT INTO menu_categories (property_id, name_en, name_es, slug, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (property_id, slug) DO NOTHING`,
        [property.id, cat.name_en, cat.name_es, cat.slug, cat.sort_order]
      );
    }
    console.log('Menu categories created:', categories.length);

    console.log('\nSeeding complete!');
    console.log('Login: admin@nayarabdt.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
