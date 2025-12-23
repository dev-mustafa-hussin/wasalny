const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function verify() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    
    const adminEmail = 'dev-mustafa-hussin@hotmail.com';
    const adminRes = await client.query('SELECT r.role FROM public.user_roles r JOIN auth.users u ON r.user_id = u.id WHERE u.email = $1', [adminEmail]);
    console.log(`Admin Role (${adminEmail}):`, adminRes.rows.map(r => r.role));

    const pendingStores = await client.query("SELECT count(*) FROM public.stores WHERE status = 'pending'");
    console.log('Total Pending Stores:', pendingStores.rows[0].count);

    const pendingDrivers = await client.query("SELECT count(*) FROM public.drivers WHERE status = 'pending'");
    console.log('Total Pending Drivers:', pendingDrivers.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

verify();
