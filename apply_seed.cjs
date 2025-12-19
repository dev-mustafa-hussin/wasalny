const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function applySeed() {
  console.log('--- APPLYING SEED DATA (CAIRO) ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251219102000_add_location_and_seed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running SQL migration...');
    await client.query(sql);
    
    console.log('✅ Seed data applied successfully.');
    console.log('   - Added Lat/Lng columns');
    console.log('   - Updated "SecureForce Market" to Cairo');
    console.log('   - Added sample products (Pepsi, Chips, etc.)');

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

applySeed();
