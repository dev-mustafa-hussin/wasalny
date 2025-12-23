const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyTrigger() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const sqlPath = 'm:\\WEP\\Wasalny\\supabase\\migrations\\20251223_automatic_setup_trigger.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('--- APPLYING AUTOMATIC SETUP TRIGGER ---');
    await client.query(sql);
    console.log('✅ Trigger applied successfully!');

  } catch (err) {
    console.error('❌ Error applying trigger:', err.message);
  } finally {
    await client.end();
  }
}

applyTrigger();
