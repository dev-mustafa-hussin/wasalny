const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function diagnose() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  const email = 'consultations@3mcode-solutions.com';
  
  try {
    await client.connect();
    
    // 1. Check user confirmation
    const userRes = await client.query('SELECT id, email_confirmed_at, last_sign_in_at FROM auth.users WHERE email = $1', [email]);
    console.log('--- USER AUTH STATUS ---');
    console.table(userRes.rows);

    // 2. Check ALL policies for user_roles and stores
    console.log('\n--- POLICIES for user_roles ---');
    const rolePol = await client.query("SELECT * FROM pg_policies WHERE tablename = 'user_roles'");
    console.table(rolePol.rows.map(p => ({ name: p.policyname, cmd: p.cmd, qual: p.qual, with_check: p.with_check })));

    console.log('\n--- POLICIES for stores ---');
    const storePol = await client.query("SELECT * FROM pg_policies WHERE tablename = 'stores'");
    console.table(storePol.rows.map(p => ({ name: p.policyname, cmd: p.cmd, qual: p.qual, with_check: p.with_check })));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

diagnose();
