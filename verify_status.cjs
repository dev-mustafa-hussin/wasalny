const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function verifyStatus() {
  console.log('--- VERIFYING STATUS ---');
  const client = new Client(config);

  try {
    await client.connect();

    const res = await client.query(`
      SELECT u.email, d.status, d.vehicle_number 
      FROM auth.users u
      JOIN public.drivers d ON u.id = d.user_id
      WHERE u.email = 'alarabiaforcosmetics@gmail.com'
    `);

    if (res.rows.length > 0) {
      const driver = res.rows[0];
      console.log(`Driver: ${driver.email}`);
      console.log(`Status: ${driver.status.toUpperCase()}`);
      
      if (driver.status === 'approved') {
        console.log('✅ SUCCESS: Driver is APPROVED.');
      } else {
        console.log(`⚠️ WARNING: Driver is still ${driver.status}.`);
      }
    } else {
      console.log('❌ Error: Driver not found.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

verifyStatus();
