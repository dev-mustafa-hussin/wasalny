const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function checkOrders() {
  console.log('--- CHECKING ORDER AVAILABILITY ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT id, status, driver_id, created_at 
      FROM public.orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('Recent Orders:');
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Driver ID: ${r.driver_id ? r.driver_id : 'NULL (Available)'}`);
    });

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkOrders();
