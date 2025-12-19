const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function debugOrderInsert() {
  console.log('--- DEBUGGING ORDER INSERT ---');
  const client = new Client(config);
  const customerEmail = 'info@3mcode-solutions.com';

  try {
    await client.connect();
    
    // 1. Get Customer ID
    const resUser = await client.query("SELECT id FROM auth.users WHERE email = $1", [customerEmail]);
    if (resUser.rows.length === 0) return console.log('❌ User not found');
    const userId = resUser.rows[0].id;
    console.log(`User ID: ${userId}`);

    // 2. Mock Store ID
    const resStore = await client.query("SELECT id FROM public.stores LIMIT 1");
    if (resStore.rows.length === 0) return console.log('❌ No stores found');
    const storeId = resStore.rows[0].id;

    // 3. Attempt Insert (Simulating RLS check requires SET ROLE, which we can't easily do here without a valid JWT, 
    // but we can check if the table exists and if we can insert as postgres superfuser first to rule out schema issues)
    
    console.log('Attempting insert as admin (postgres user) to verify schema...');
    const resInsert = await client.query(`
      INSERT INTO public.orders (customer_id, store_id, total_amount, delivery_address, delivery_fee, status)
      VALUES ($1, $2, 100, 'Test Address', 10, 'pending')
      RETURNING id
    `, [userId, storeId]);
    
    console.log('✅ Admin Insert Success! Order ID:', resInsert.rows[0].id);

    // If Admin insert works, it's 99% an RLS issue for the authenticated user.
    // Let's check policies.
    const resPolicies = await client.query(`
      SELECT policyname, cmd, roles 
      FROM pg_policies 
      WHERE tablename = 'orders'
    `);
    
    console.log('\n--- EXISTING POLICIES ON ORDERS ---');
    if (resPolicies.rowCount === 0) {
      console.log('❌ NO POLICIES FOUND! (Default is deny all for public/anon/authenticated usually)');
    } else {
      resPolicies.rows.forEach(p => {
        console.log(`- ${p.policyname} (${p.cmd})`);
      });
    }

  } catch (err) {
    console.log('❌ Insert Error:', err.message);
  } finally {
    await client.end();
  }
}

debugOrderInsert();
