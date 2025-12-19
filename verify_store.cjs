const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function verifyStore() {
  console.log('--- VERIFYING STORE REQUEST ---');
  const client = new Client(config);
  const targetEmail = 'info@secureforce.3mcode-solutions.com';

  try {
    await client.connect();
    
    // 1. Check User
    console.log(`Checking Email: ${targetEmail}`);
    const resUser = await client.query("SELECT id, email_confirmed_at FROM auth.users WHERE email = $1", [targetEmail]);
    
    if (resUser.rows.length === 0) {
      console.log('❌ User NOT found in auth.users');
      return;
    }
    const userId = resUser.rows[0].id;
    console.log(`✅ User ID: ${userId}`);
    if(!resUser.rows[0].email_confirmed_at) console.log('⚠️ WARNING: Email not confirmed!');

    // 2. Check Role
    const resRole = await client.query("SELECT role FROM user_roles WHERE user_id = $1", [userId]);
    if (resRole.rows.length > 0) {
      console.log(`✅ Role: ${resRole.rows[0].role}`);
    } else {
      console.log('❌ Role NOT found in user_roles');
    }

    // 3. Check Store Entry
    // Note: stores table has owner_id
    const resStore = await client.query("SELECT * FROM stores WHERE owner_id = $1", [userId]);
    if (resStore.rows.length > 0) {
      console.log('✅ Store Entry Found:');
      console.log(`   Name: ${resStore.rows[0].name}`);
      console.log(`   Type: ${resStore.rows[0].type}`);
      console.log(`   Status: ${resStore.rows[0].status}`);
    } else {
      console.log('❌ Store Entry NOT found in stores table.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

verifyStore();
