const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkNewUser() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  const email = 'consultations@3mcode-solutions.com';
  
  try {
    await client.connect();
    console.log(`--- CHECKING NEW EMAIL: ${email} ---`);
    
    // 1. Find User ID in auth.users
    const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log('❌ User not found in auth.users. Registration likely failed completely.');
      return;
    }
    const userId = userRes.rows[0].id;
    console.log(`✅ User found. ID: ${userId}`);

    // 2. Check user_roles
    const roleRes = await client.query('SELECT role FROM public.user_roles WHERE user_id = $1', [userId]);
    console.log('Roles:', roleRes.rows.map(r => r.role));

    // 3. Check stores
    const storeRes = await client.query('SELECT id, name, status, created_at FROM public.stores WHERE owner_id = $1', [userId]);
    if (storeRes.rows.length > 0) {
      console.log('🏬 Store Request Found:');
      console.table(storeRes.rows);
    } else {
      console.log('ℹ️ No Store Data found for this user ID.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkNewUser();
