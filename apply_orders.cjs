const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function createOrderTables() {
  console.log('--- CREATING ORDER TABLES ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251219110000_create_orders.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running SQL migration...');
    await client.query(sql);
    
    console.log('✅ Order tables created successfully.');
    console.log('   - orders');
    console.log('   - order_items');
    console.log('   - RLS policies applied');

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

createOrderTables();
