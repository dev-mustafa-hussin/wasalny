const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function makeProfilesPublic() {
  console.log('--- MAKING PROFILES PUBLIC (READ-ONLY) ---');
  const client = new Client(config);

  try {
    await client.connect();

    // Drop previous restrictive policies if they exist or conflict
    await client.query('DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles');
    await client.query('DROP POLICY IF EXISTS "Users can view own profile" ON profiles'); // heuristic drop
    
    // Create broad read policy
    await client.query(`
      CREATE POLICY "Public profiles" ON profiles
      FOR SELECT
      USING (true)
    `);
    
    // Keep write restricted (e.g. only owner)
    await client.query(`
      CREATE POLICY "Users can insert own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id)
    `);

    await client.query(`
      CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = user_id)
    `);

    console.log('✅ Profiles are now readable by everyone.');

  } catch (err) {
    // Ignore "policy already exists" benign errors if we handle them
    console.log('ℹ️ Note:', err.message);
  } finally {
    await client.end();
  }
}

makeProfilesPublic();
