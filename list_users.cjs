const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function listUsers() {
  console.log('--- LISTING ALL USERS & ROLES ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    // Join auth.users, user_roles, and profiles (if name exists there)
    // Note: auth.users is protected, but we are connecting as postgres/service_role equivalent from config
    const res = await client.query(`
      SELECT 
        u.email,
        ur.role,
        p.full_name
      FROM auth.users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN public.profiles p ON u.id = p.user_id
      ORDER BY ur.role
    `);

    console.log('Found Users:');
    res.rows.forEach(r => {
      console.log(`- Role: [${r.role || 'NONE'}] | Email: ${r.email} | Name: ${r.full_name || 'N/A'}`);
    });

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

listUsers();
