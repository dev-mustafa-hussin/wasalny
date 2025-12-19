const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function debugProfiles() {
  console.log('--- DEBUGGING PROFILE FETCH ---');
  const client = new Client(config);

  try {
    await client.connect();

    // 1. Fetch the driver first (like frontend)
    console.log('1. Fetching Driver...');
    const resDriver = await client.query("SELECT user_id, id FROM drivers WHERE status = 'approved' LIMIT 1");
    
    if (resDriver.rows.length === 0) {
      console.log('❌ No approved drivers found to test.');
      // Try pending?
       const resPending = await client.query("SELECT user_id, id FROM drivers LIMIT 1");
       if(resPending.rows.length > 0) console.log('   (Found a pending/other driver though)');
      return;
    }

    const driver = resDriver.rows[0];
    console.log(`   Found Driver User ID: ${driver.user_id}`);

    // 2. Fetch Profile directly
    console.log('\n2. Fetching Profile for this User ID directly...');
    const resProfile = await client.query("SELECT * FROM profiles WHERE user_id = $1", [driver.user_id]);
    
    if (resProfile.rows.length > 0) {
      console.log('✅ Profile Found in DB:');
      console.log(resProfile.rows[0]);
    } else {
      console.log('❌ PROFILE MISSING IN DB for this User ID!');
    }

    // 3. Check Admin Role for 'dev-mustafa-hussin@hotmail.com'
    // simulating why Admin might not see it
    console.log('\n3. Verifying Admin Role exists for you...');
    const resAdmin = await client.query(`
        SELECT r.role 
        FROM auth.users u 
        JOIN user_roles r ON u.id = r.user_id 
        WHERE u.email = 'dev-mustafa-hussin@hotmail.com'
    `);
    if(resAdmin.rows.length > 0) {
        console.log(`   Role found: ${resAdmin.rows[0].role}`);
    } else {
        console.log('   ❌ No role found for your email.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

debugProfiles();
