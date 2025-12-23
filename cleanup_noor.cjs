const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanup() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  const email = 'noor-sales@3mcode-solutions.com';
  
  try {
    await client.connect();
    const res = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      const id = res.rows[0].id;
      await client.query('DELETE FROM public.user_roles WHERE user_id = $1', [id]);
      await client.query( 'DELETE FROM public.drivers WHERE user_id = $1', [id]);
      await client.query('DELETE FROM public.profiles WHERE user_id = $1', [id]);
      await client.query('DELETE FROM auth.users WHERE id = $1', [id]);
      console.log(`✅ Cleaned up: ${email}`);
    } else {
      console.log(`ℹ️ Not found: ${email}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

cleanup();
