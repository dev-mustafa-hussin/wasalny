const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function listAllUsers() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query('SELECT email, created_at, raw_user_meta_data FROM auth.users ORDER BY created_at DESC');
    console.log('--- ALL AUTH USERS ---');
    console.table(res.rows.map(r => ({
      Email: r.email,
      Created: r.created_at,
      Role: r.raw_user_meta_data?.role,
      Name: r.raw_user_meta_data?.full_name
    })));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

listAllUsers();
