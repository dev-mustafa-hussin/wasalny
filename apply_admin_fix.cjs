const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function applyFix() {
  console.log('--- APPLYING ADMIN PERMISSIONS FIX ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251222_fix_admin_permissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying SQL Migration...');
    await client.query(sql);
    console.log('✅ Changes applied successfully.');

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

applyFix();
