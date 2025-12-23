const fs = require('fs');
const { Client } = require('pg');

// Using the proven connection string from check_specific_user.cjs
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function executeFix() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const sqlPath = 'm:\\WEP\\Wasalny\\supabase\\migrations\\20251223_comprehensive_fix.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('--- EXECUTING COMPREHENSIVE FIX ---');
    await client.query(sql);
    console.log('✅ Comprehensive fix executed successfully!');

    // Verification check
    const enumRes = await client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'app_role'");
    console.log('Current Roles in Enum:', enumRes.rows.map(r => r.enumlabel));

    const statusCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'status'");
    console.log('Stores has status column:', statusCol.rows.length > 0);

  } catch (err) {
    console.error('❌ Error executing fix:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  } finally {
    await client.end();
  }
}

executeFix();
