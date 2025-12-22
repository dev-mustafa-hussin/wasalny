const { Client } = require('pg');
const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

async function run() {
  console.log('--- INSPECTING DATABASE ---');
  const client = new Client(config);
  try {
    await client.connect();
    
    console.log('Schemas and Tables:');
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `);
    
    res.rows.forEach(row => {
      console.log(`${row.table_schema}.${row.table_name}`);
    });

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
