const fs = require('fs');
const { Client } = require('pg');

// Exact string format derived from user instructions:
// postgresql://postgres.dfcyclxrtcnymyuolbyi:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
// Note: Pooler port is usually 6543 (transaction) or 5432 (session). User said 5432 session pooler.
// Standard Supabase pooler is 6543 for transaction, 5432 for session. 
// User explicit instruction: "aws-1-eu-west-1.pooler.supabase.com:5432"

const config = {
  // username: 'postgres.dfcyclxrtcnymyuolbyi'
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function runOps() {
  console.log('--- FINAL CONNECTION ATTEMPT ---');
  console.log('Target:', config.connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ CONNECTED SUCCESSFULLY!');

    const sql = fs.readFileSync('m:\\WEP\\Wasalny\\supabase\\migrations\\20251219055000_add_roles_and_status.sql', 'utf8');
    await client.query(sql);
    console.log('✅ MIGRATION EXECUTED!');
    console.log('Tables and Policies have been applied/repaired.');

  } catch (err) {
    console.log('❌ FAILED AGAIN');
    console.log('Error:', err.message);
    if (err.code) console.log('Code:', err.code);
  } finally {
    await client.end();
  }
}

runOps();
