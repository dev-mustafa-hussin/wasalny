const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function listAccounts() {
  console.log('--- FETCHING ACCOUNTS ---');
  const client = new Client(config);

  try {
    await client.connect();

    // 1. Get Admins
    console.log('\n👮 ADMINS:');
    const resAdmins = await client.query(`
      SELECT u.email, u.created_at
      FROM auth.users u
      JOIN public.user_roles r ON u.id = r.user_id
      WHERE r.role = 'admin'
    `);
    
    if (resAdmins.rows.length === 0) {
      console.log('   (No admins found)');
    } else {
      resAdmins.rows.forEach(r => {
        console.log(`   - Email: ${r.email} (Created: ${new Date(r.created_at).toISOString().split('T')[0]})`);
      });
    }

    // 2. Get Drivers
    console.log('\n🚗 DRIVERS:');
    const resDrivers = await client.query(`
      SELECT u.email, d.status, d.vehicle_type, d.vehicle_number, d.created_at
      FROM auth.users u
      JOIN public.drivers d ON u.id = d.user_id
    `);

    if (resDrivers.rows.length === 0) {
      console.log('   (No drivers found with profiles)');
    } else {
      resDrivers.rows.forEach(r => {
        console.log(`   - Email: ${r.email} | Status: ${r.status} | Vehicle: ${r.vehicle_type} (${r.vehicle_number})`);
      });
    }

    // 3. Get All Users (Summary)
    console.log('\n👥 ALL REGISTERED EMAILS (auth.users top 10):');
    const resAll = await client.query('SELECT email, id FROM auth.users LIMIT 10');
    resAll.rows.forEach(r => console.log(`   - ${r.email}`));

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('\n--- END ---');
  }
}

listAccounts();
