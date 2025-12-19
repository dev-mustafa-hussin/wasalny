const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function fixRLS() {
  console.log('--- FIXING STORES RLS ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251219104500_fix_stores_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying RLS Policy...');
    await client.query(sql);
    console.log('✅ Policy applied: Public read stores');

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixRLS();
