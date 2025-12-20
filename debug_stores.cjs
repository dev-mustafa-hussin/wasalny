const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function checkStores() {
  console.log('--- CHECKING STORES DATA ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    const res = await client.query("SELECT id, name, type, is_active, status FROM public.stores");
    
    console.log('Stores found:', res.rowCount);
    res.rows.forEach(r => {
      console.log(`- [${r.name}] Type: '${r.type}', Active: ${r.is_active}, Status: ${r.status}`);
    });

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkStores();
