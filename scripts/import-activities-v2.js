'use strict';
const fs = require('fs');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:raMRtBMDMfqnuLSVMnDpDyvqiismKLNV@turntable.proxy.rlwy.net:14978/railway',
  ssl: { rejectUnauthorized: false },
});

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += c; }
  }
  result.push(current.trim());
  return result;
}

function parseDate(d) {
  if (!d) return null;
  const p = d.split('/');
  if (p.length !== 3) return null;
  let [m, day, y] = p;
  y = parseInt(y);
  if (y > 2030) y = 2026; // fix typo dates like 2040, 2923
  return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function parseTime(t) {
  if (!t) return null;
  return t.length >= 5 ? t.slice(0, 8) : null;
}

function parseStatus(s) {
  if (!s) return 'pending';
  const l = s.toLowerCase();
  if (l === 'confirmado' || l === 'confirmed') return 'confirmed';
  if (l === 'completado' || l === 'completed') return 'completed';
  if (l === 'cancelado' || l === 'cancelled' || l === 'canceled') return 'cancelled';
  return 'pending';
}

function matchProduct(name, productMap) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('zapatilla') || n === 'zpatilla tour') return productMap['Zapatilla Tour'];
  if (n.includes('bio') && !n.includes('ebike') && !n.includes('e-bike')) return productMap['Bioluminescence Tour'];
  if ((n.includes('sunset') || n.includes('puesta de sol')) && !n.includes('full day') && !n.includes('half day')) return productMap['Sunset Tour'];
  if (n.includes('monkey') || n.includes('monos') || n.includes('money island') || n.includes('isla de los monos')) return productMap['Monkey Island Tour'];
  if (n.includes('green acres') || n.includes('green acress') || n.includes('green acrees')) return productMap['Green Acres Chocolate Farm Tour'];
  if (n.includes('atv') || n.includes('utv')) return productMap['ATV Adventure'];
  if (n.includes('catamaran') || n.includes('jager')) return productMap['Catamaran Sailing Charter'];
  if (n.includes('ebike') || n.includes('e-bike') || n.includes('e bike') || n.includes('e bikes') || n.includes('ebikes')) return productMap['E-Bike Rental'];
  if (n.includes('bat cave') || n.includes('cueva de murcielago')) return productMap['Bat Cave Tour'];
  if (n.includes('polo') || n.includes('polo beach')) return productMap['Polo Beach Excursion'];
  if (n.includes('red frog') && !n.includes('polo')) return productMap['Red Frog Beach Visit'];
  if (n.includes('horse') || n.includes('caballo')) return productMap['Horseback Riding Excursion'];
  if (n.includes('yoga')) return productMap['Private Yoga Lesson'];
  if (
    n.includes('massage') || n.includes('masaje') || n.includes('manicure') || n.includes('manicura') ||
    n.includes('pedicure') || n.includes('pedicura') || n.includes('facial') || n.includes('body peal') ||
    n.includes('body wrap') || n.includes('cocoa lux') || n.includes('cocoa wellness') ||
    n.includes('head to toe') || n.includes('wellness') || n.includes('coconut body') ||
    n.includes('swedish') || n.includes('deep tissue') || n.includes('relax') || n.includes('spa') ||
    n.includes('90 minutes') || n.includes('60 min')
  ) return productMap['Spa: Massage & Body Treatments'];
  if (n.includes('sloth') || n.includes('perezos') || n.includes('peresoso') || n.includes('osos')) return productMap['Sloth Observation '];
  if (n.includes('snorkel')) return productMap['Snorkeling Tour'];
  if (n.includes('dive') || n.includes('buceo') || n.includes('divers') || n.includes('scuba')) return productMap['Scuba Diving Expedition'];
  if (n.includes('starfish') || n.includes('bird island') || n.includes('estrella') || n.includes('dolphin') || n.includes('delfin')) return productMap['Starfish Beach & Bird Island'];
  if (n.includes('surf')) return productMap['Surf Lessons & Guiding'];
  if (n.includes('escudo')) return productMap['Escudo de Veraguas Expedition'];
  if (n.includes('fishing') || n.includes('pesca') || n.includes('sport fish')) return productMap['Sport Fishing Charter'];
  if (n.includes('water taxi')) return productMap['Water Taxi Transfer'];
  if (
    n.includes('cacao') || n.includes('cocoa') || n.includes('chocolate') || n.includes('indigena') ||
    n.includes('artesano') || n.includes('artezano') || n.includes('camino del cacao') ||
    n.includes('buena esperanza') || n.includes('shark')
  ) return productMap['Cacao & Indigenous Culture Tour'];
  if (
    n.includes('full day') || n.includes('fullday') || n.includes('fyll day') ||
    n.includes('dia completo') || n.includes('bote privado') ||
    (n.includes('private boat') && !n.includes('half'))
  ) return productMap['Private Boat Charter (Full Day)'];
  if (
    n.includes('half day') || n.includes('halfday') || n.includes('medio dia') ||
    n.includes('medio d') || n.includes('mediodia') || n.includes('1/2 day') ||
    n.includes('1/2 dia') || n.includes('private boat')
  ) return productMap['Private Boat Charter (Half Day)'];
  return null;
}

const CSV_PATH = process.argv[2] || 'C:/Users/jovy2/Downloads/Concierge - Actividades (2).csv';

async function run() {
  const q = async (sql, p) => (await pool.query(sql, p || [])).rows;

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const csvData = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const id = cols[0]?.trim();
    if (id) csvData[id] = {
      fecha: cols[1]?.trim(), hora: cols[2]?.trim(), vendedor: cols[3]?.trim(),
      actividad: cols[4]?.trim(), huesped: cols[5]?.trim(),
      participantes: parseInt(cols[6]?.trim()) || 1,
      estado_vendedor: cols[7]?.trim(), estado_huesped: cols[8]?.trim(),
      fecha_fact: cols[9]?.trim(), fecha_pag: cols[10]?.trim(), notas: cols[11]?.trim(),
    };
  }

  // Product name -> id map
  const prods = await q('SELECT id, name_en FROM tour_products');
  const productMap = {};
  prods.forEach(p => { productMap[p.name_en.trim()] = p.id; });

  // Existing legacy_name -> product_id lookup
  const existingMappings = await q('SELECT DISTINCT legacy_activity_name, product_id FROM tour_bookings WHERE legacy_activity_name IS NOT NULL AND product_id IS NOT NULL');
  const nameToProduct = {};
  existingMappings.forEach(r => { nameToProduct[r.legacy_activity_name.toLowerCase()] = r.product_id; });

  // Guest legacy_id -> db id
  const guests = await q('SELECT id, legacy_appsheet_id FROM guests WHERE legacy_appsheet_id IS NOT NULL');
  const guestMap = {};
  guests.forEach(g => { guestMap[g.legacy_appsheet_id] = g.id; });

  const dbIds = new Set((await q('SELECT legacy_appsheet_id FROM tour_bookings')).map(r => r.legacy_appsheet_id));
  const newRecords = Object.entries(csvData).filter(([id]) => !dbIds.has(id)).map(([id, d]) => ({ id, ...d }));

  console.log('New records to insert:', newRecords.length);

  let inserted = 0;
  const unmatched = [];

  for (const r of newRecords) {
    const actName = r.actividad || null;
    const isCancelled = actName && actName.toLowerCase().includes('cancel');

    const guestStatus = isCancelled ? 'cancelled' : parseStatus(r.estado_huesped);
    const vendorStatus = isCancelled ? 'cancelled' : parseStatus(r.estado_vendedor);

    const productId = nameToProduct[actName?.toLowerCase()] || matchProduct(actName, productMap) || null;

    const activityDate = parseDate(r.fecha);
    const startTime = parseTime(r.hora);
    const guestId = guestMap[r.huesped] || null;
    const billedDate = r.fecha_fact ? parseDate(r.fecha_fact) : null;
    const paidDate = r.fecha_pag ? parseDate(r.fecha_pag) : null;

    const isPureJunk = actName && ['cancelado', '.', 'err', 'df', 'duplicado', 'mercancia', 'tour?', 'va a la isla'].includes(actName.toLowerCase());
    if (!productId && actName && !isCancelled && !isPureJunk) {
      unmatched.push({ id: r.id, name: actName });
    }

    await q(
      `INSERT INTO tour_bookings
        (legacy_appsheet_id, legacy_activity_name, legacy_vendor_id, guest_id,
         activity_date, start_time, num_guests, guest_status, vendor_status,
         billed_date, paid_date, notes, product_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [r.id, actName, r.vendedor || null, guestId, activityDate, startTime,
       r.participantes, guestStatus, vendorStatus, billedDate, paidDate, r.notas || null, productId]
    );
    inserted++;
  }

  console.log('Inserted:', inserted);
  if (unmatched.length > 0) {
    console.log('Could not match product for', unmatched.length, 'records:');
    unmatched.forEach(u => console.log(' ', u.id, JSON.stringify(u.name)));
  } else {
    console.log('All records matched to a product!');
  }

  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
