const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function fixProfilesRLS() {
  console.log('--- FIXING PROFILES RLS ---');
  const client = new Client(config);

  try {
    await client.connect();

    // Create function is_admin if not exists (it should exist from previous steps)
    // We'll just use it in the policy
    
    console.log('Adding "Admins can manage all profiles" policy...');
    
    // We'll try to drop it first just in case
    try {
        await client.query('DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles');
    } catch (e) {}

    await client.query(`
      CREATE POLICY "Admins can manage all profiles" ON profiles
      FOR ALL USING (is_admin())
    `);
    
    console.log('✅ Policy added successfully.');
    
    // Also verify if there is a basic user read policy?
    // "Users can insert their own profile" etc.
    // For now, let's just fix the Admin view issue.

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixProfilesRLS();
