import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🌱 Seeding database...');

    // 1. Insert Nayara property
    console.log('\n📍 Inserting property...');
    const propertyResult = await pool.query(
      `INSERT INTO properties (name, code, timezone, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         timezone = EXCLUDED.timezone,
         currency = EXCLUDED.currency
       RETURNING id, name, code`,
      ['Nayara Bocas del Toro', 'NAYARA_BDT', 'America/Panama', 'USD']
    );
    const property = propertyResult.rows[0];
    console.log(`✓ Property created: ${property.name} (${property.code})`);
    console.log(`  ID: ${property.id}`);

    // 2. Insert 20 rooms (101-120)
    console.log('\n🏨 Inserting rooms...');
    const roomTypes = ['Standard', 'Deluxe', 'Suite'];
    const rooms = [];

    for (let i = 101; i <= 120; i++) {
      const roomType = roomTypes[Math.floor((i - 101) / 7) % 3];
      const roomResult = await pool.query(
        `INSERT INTO rooms (property_id, room_number, room_type, is_active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (property_id, room_number) DO UPDATE SET
           room_type = EXCLUDED.room_type,
           is_active = EXCLUDED.is_active
         RETURNING id, room_number, room_type`,
        [property.id, i.toString(), roomType, true]
      );
      rooms.push(roomResult.rows[0]);
    }
    console.log(`✓ Created ${rooms.length} rooms:`);
    console.log(`  - Standard: ${rooms.filter(r => r.room_type === 'Standard').length}`);
    console.log(`  - Deluxe: ${rooms.filter(r => r.room_type === 'Deluxe').length}`);
    console.log(`  - Suite: ${rooms.filter(r => r.room_type === 'Suite').length}`);

    // 3. Create admin user
    console.log('\n👤 Creating admin user...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const userResult = await pool.query(
      `INSERT INTO staff_users (property_id, email, password_hash, first_name, last_name, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         permissions = EXCLUDED.permissions,
         is_active = EXCLUDED.is_active
       RETURNING id, email, first_name, last_name, role`,
      [
        property.id,
        'admin@nayarabdt.com',
        passwordHash,
        'Admin',
        'User',
        'admin',
        ['view_orders', 'manage_orders', 'manage_menu', 'manage_bookings', 'manage_users'],
        true
      ]
    );
    const user = userResult.rows[0];
    console.log(`✓ Admin user created: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.first_name} ${user.last_name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Password: admin123 (please change after first login)`);

    // 4. Insert 3 menu categories
    console.log('\n📋 Inserting menu categories...');
    const categories = [
      {
        name_en: 'Gastronomy',
        name_es: 'Gastronomía',
        slug: 'gastronomy',
        sort_order: 1
      },
      {
        name_en: 'Leisure',
        name_es: 'Ocio',
        slug: 'leisure',
        sort_order: 2
      },
      {
        name_en: 'Spa',
        name_es: 'Spa',
        slug: 'spa',
        sort_order: 3
      }
    ];

    const insertedCategories = [];
    for (const category of categories) {
      const categoryResult = await pool.query(
        `INSERT INTO menu_categories (property_id, name_en, name_es, slug, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (property_id, slug) DO UPDATE SET
           name_en = EXCLUDED.name_en,
           name_es = EXCLUDED.name_es,
           sort_order = EXCLUDED.sort_order,
           is_active = EXCLUDED.is_active
         RETURNING id, name_en, name_es, slug`,
        [property.id, category.name_en, category.name_es, category.slug, category.sort_order, true]
      );
      insertedCategories.push(categoryResult.rows[0]);
    }
    console.log(`✓ Created ${insertedCategories.length} menu categories:`);
    insertedCategories.forEach(cat => {
      console.log(`  - ${cat.name_en} / ${cat.name_es} (${cat.slug})`);
      console.log(`    ID: ${cat.id}`);
    });

    // Summary
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Properties: 1`);
    console.log(`  - Rooms: ${rooms.length}`);
    console.log(`  - Admin Users: 1`);
    console.log(`  - Menu Categories: ${insertedCategories.length}`);
    console.log('\n🔐 Admin Login:');
    console.log(`  Email: admin@nayarabdt.com`);
    console.log(`  Password: admin123`);
    console.log(`  ⚠️  Please change the password after first login!`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
