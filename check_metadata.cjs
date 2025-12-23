const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkMetadata() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  const email = 'consultations@3mcode-solutions.com';
  
  try {
    await client.connect();
    const res = await client.query('SELECT raw_user_meta_data FROM auth.users WHERE email = $1', [email]);
    console.log('--- USER METADATA ---');
    console.log(JSON.stringify(res.rows[0].raw_user_meta_data, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkMetadata();
