const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:fms2225115FMS%40%40%40@db.dfcyclxrtcnymyuolbyi.supabase.co:5432/postgres';
const sqlFilePath = 'm:\\WEP\\Wasalny\\supabase\\migrations\\20251219055000_add_roles_and_status.sql';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('Read SQL file');

    await client.query(sql);
    console.log('Migration applied successfully');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
