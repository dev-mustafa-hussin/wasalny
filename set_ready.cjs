const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function setOrderReady() {
  console.log('--- UPDATING ORDER STATUS TO READY ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    // Get the latest PENDING order
    const res = await client.query(`
      SELECT id, status 
      FROM public.orders 
      WHERE status = 'pending'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (res.rowCount > 0) {
      console.log(`✅ Updated ${res.rowCount} orders to 'ready'.`);
      res.rows.forEach(r => console.log(`   - Order ${r.id}: ${r.status}`));
    } else {
      console.log('⚠️ No pending orders found.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

setOrderReady();
