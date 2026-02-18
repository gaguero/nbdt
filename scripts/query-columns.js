const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:raMRtBMDMfqnuLSVMnDpDyvqiismKLNV@turntable.proxy.rlwy.net:14978/railway';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const result = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('transfers', 'guests', 'vendors') 
    ORDER BY table_name, ordinal_position;
  `);

  await client.end();

  // Group by table for readable output
  const tables = {};
  for (const row of result.rows) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push({ column: row.column_name, type: row.data_type });
  }

  for (const [table, cols] of Object.entries(tables)) {
    console.log(`\n=== ${table} (${cols.length} columns) ===`);
    for (const { column, type } of cols) {
      // Highlight any legacy/external/appsheet-related columns
      const flag = /legacy|external|appsheet|ext_|source/i.test(column) ? ' <-- NOTABLE' : '';
      console.log(`  ${column.padEnd(40)} ${type}${flag}`);
    }
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
