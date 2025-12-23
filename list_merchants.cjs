const { Client } = require('pg');
const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function listRequests() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    
    console.log('--- MERCHANT JOIN REQUESTS (STORES) ---');
    const query = `
      SELECT 
        u.email, 
        s.name as store_name, 
        s.status, 
        s.created_at
      FROM public.stores s
      JOIN auth.users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `;
    
    const res = await client.query(query);
    
    if (res.rows.length === 0) {
      console.log('No store requests found in the database.');
    } else {
      console.table(res.rows.map(r => ({
        Email: r.email,
        "Store Name": r.store_name,
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

listRequests();
