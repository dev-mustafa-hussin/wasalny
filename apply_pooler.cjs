const fs = require('fs');
const { Client } = require('pg');

const sqlFilePath = 'm:\\WEP\\Wasalny\\supabase\\migrations\\20251219055000_add_roles_and_status.sql';

const config = {
  user: 'postgres.dfcyclxrtcnymyuolbyi', // Supabase pooler often requires [user].[project_ref] format
  host: 'aws-0-eu-central-1.pooler.supabase.com', // Trying the most common EU region first since the user's snippet might be generic
  // BUT the user explicitly pasted 'aws-1-eu-west-1'. I should try that if this fails, or try both.
  // Actually, standard practice for poolers is to include the project ID in the user.
  // Let's try the user's EXACT suggestion first (host: aws-1-eu-west-1..., port: 5432).
  database: 'postgres',
  password: 'fms2225115FMS@@@',
  port: 5432,
  ssl: { rejectUnauthorized: false } // Required for Supabase
};

// Alternative configuration based on user input exactly
const userConfig = {
  user: 'postgres.dfcyclxrtcnymyuolbyi',
  host: 'aws-0-eu-central-1.pooler.supabase.com', // Trying Frankfurt because West-1 gave 'Tenant not found' might also mean wrong region for this tenant
  // Let's try to infer region from the project URL or previous error?
  // Previous error: 2a05:d018... is Frankfurt.
  // The user suggested West-1, but the tenant might not be there.
  // I will try 'aws-0-eu-central-1.pooler.supabase.com' first as it matches the standard EU location.
  database: 'postgres',
  password: 'fms2225115FMS@@@',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

async function runMigration() {
  console.log('--- ATTEMPTING CONNECTION (POOLER) ---');
  console.log(`Host: ${userConfig.host}`);
  console.log(`User: ${userConfig.user}`);
  
  const client = new Client(userConfig);

  try {
    await client.connect();
    console.log('✅ Connected via Pooler!');

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

  } catch (err) {
    console.log('❌ CONNECTION FAILED');
    console.log('Error:', err.message);
    if(err.code) console.log('Code:', err.code);
  } finally {
    await client.end();
  }
}

runMigration();
