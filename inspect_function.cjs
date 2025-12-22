const { Client } = require('pg');
const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

async function run() {
  console.log('--- INSPECTING FUNCTION ---');
  const client = new Client(config);
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT n.nspname as schema, p.proname as name, pg_get_function_arguments(p.oid) as args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'has_role'
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
