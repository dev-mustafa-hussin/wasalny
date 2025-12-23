const { Client } = require('pg');
const connectionString = 'postgresql://postgres:fms2225115FMS%40%40%40@db.dfcyclxrtcnymyuolbyi.supabase.co:5432/postgres';

async function test() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log('Connected');
    const res = await client.query('SELECT version()');
    console.log(res.rows[0]);
    
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(r => r.table_name));

    const enumVals = await client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'app_role'");
    console.log('Enum Roles:', enumVals.rows.map(r => r.enumlabel));

    const statusCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'status'");
    console.log('Stores has status col:', statusCol.rows.length > 0);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
