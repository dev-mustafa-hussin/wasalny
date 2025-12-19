const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:fms2225115FMS%40%40%40@db.dfcyclxrtcnymyuolbyi.supabase.co:5432/postgres';
const sqlFilePath = 'm:\\WEP\\Wasalny\\supabase\\migrations\\20251219055000_add_roles_and_status.sql';

async function runMigration() {
  console.log('--- EXECUTING MIGRATION ---');
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    await client.query(sql);
    console.log('✅ Migration executed successfully.');
    console.log('Tables created/updated: drivers, stores, user_roles.');

  } catch (err) {
    console.log('❌ EXECUTION FAILED');
    console.log('Error:', err.message);
    if (err.code) console.log('Code:', err.code);
    if (err.address) console.log('Address:', err.address);
  } finally {
    await client.end();
    console.log('--- FINISHED ---');
  }
}

runMigration();
