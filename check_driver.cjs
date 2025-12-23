const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkDriver() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  const email = 'noor-sales@3mcode-solutions.com';
  
  try {
    await client.connect();
    console.log(`--- CHECKING DRIVER EMAIL: ${email} ---`);
    
    const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log('❌ User not created.');
      return;
    }
    const userId = userRes.rows[0].id;
    console.log(`✅ User found. ID: ${userId}`);

    const roleRes = await client.query('SELECT role FROM public.user_roles WHERE user_id = $1', [userId]);
    console.log('Roles:', roleRes.rows.map(r => r.role));

    const driverRes = await client.query('SELECT * FROM public.drivers WHERE user_id = $1', [userId]);
    if (driverRes.rows.length > 0) {
      console.log('🚗 Driver Request Found:');
      console.table(driverRes.rows);
    } else {
      console.log('ℹ️ No Driver Data found.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDriver();
