const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function listDrivers() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    
    console.log('--- DRIVER JOIN REQUESTS ---');
    const query = `
      SELECT 
        u.email, 
        d.vehicle_type, 
        d.status, 
        d.created_at
      FROM public.drivers d
      JOIN auth.users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `;
    
    const res = await client.query(query);
    
    if (res.rows.length === 0) {
      console.log('No driver requests found.');
    } else {
      console.table(res.rows.map(r => ({
        Email: r.email,
        Vehicle: r.vehicle_type,
        Status: r.status,
        Date: new Date(r.created_at).toLocaleString()
      })));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

listDrivers();
