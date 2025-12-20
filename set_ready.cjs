const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function setReady() {
  console.log('--- UPDATING STORE ORDER STATUS ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    // 1. Get latest pending
    const res = await client.query(`
      SELECT id FROM public.orders 
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (res.rows.length === 0) {
      console.log('⚠️ No pending orders found.');
      return;
    }

    const orderId = res.rows[0].id;
    console.log(`Found Pending Order: ${orderId}`);

    // 2. Update to Ready
    await client.query(`
      UPDATE public.orders
      SET status = 'ready'
      WHERE id = $1
    `, [orderId]);

    console.log('✅ Order marked as READY by Store (Simulated).');

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

setReady();
