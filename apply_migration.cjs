const fs = require('fs');
const { Client } = require('pg');

// Trying alternative connection string formats if needed, or debugging.
// Standard: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
const connectionString = 'postgresql://postgres:fms2225115FMS%40%40%40@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true'; 
// Wait, I don't know the region. I will stick to the direct one but log more info.
const directConnectionString = 'postgresql://postgres:fms2225115FMS%40%40%40@db.dfcyclxrtcnymyuolbyi.supabase.co:5432/postgres';

async function runMigration() {
  console.log('Attempting to connect to:', directConnectionString.replace(/:[^:@]+@/, ':****@'));
  const client = new Client({ connectionString: directConnectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync('m:\\WEP\\Wasalny\\supabase\\migrations\\20251219055000_add_roles_and_status.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
