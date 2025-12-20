const { Client } = require('pg');

// Original connection string
const connectionString = 'postgresql://postgres:fms2225115FMS%40%40%40@db.dfcyclxrtcnymyuolbyi.supabase.co:5432/postgres';

async function diagnose() {
  console.log('--- STARTING CONNECTION DIAGNOSIS ---');
  console.log('Target: db.dfcyclxrtcnymyuolbyi.supabase.co:5432');
  
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    await client.connect();
    console.log('✅ Connection Successful!');
    
    // Check tables
    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📂 Tables found:', resTables.rows.map(r => r.table_name));

    // Check drivers count
    try {
      const resDrivers = await client.query('SELECT count(*) FROM drivers');
      console.log('🚗 Drivers count:', resDrivers.rows[0].count);
    } catch (e) {
      console.log('❌ Error querying drivers:', e.message);
    }

    // Check user_roles count
    try {
      const resRoles = await client.query('SELECT * FROM user_roles');
      console.log('busts User Roles:', resRoles.rows);
    } catch (e) {
      console.log('❌ Error querying user_roles:', e.message);
    }

  } catch (err) {
    console.log('❌ CONNECTION FAILED');
    console.log('Error Name:', err.name);
    console.log('Error Message:', err.message);
    console.log('Error Code:', err.code);
    if (err.address) console.log('Resolved Address:', err.address);
  } finally {
    await client.end();
    console.log('--- END DIAGNOSIS ---');
  }
}

diagnose();
