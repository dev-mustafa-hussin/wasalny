const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function fixStore() {
  console.log('--- FIXING STORE REGISTRATION ---');
  const client = new Client(config);
  const targetEmail = 'info@secureforce.3mcode-solutions.com';

  try {
    await client.connect();
    
    // 1. Get User ID
    const resUser = await client.query("SELECT id FROM auth.users WHERE email = $1", [targetEmail]);
    if (resUser.rows.length === 0) return console.log('❌ User not found');
    const userId = resUser.rows[0].id;

    // 2. Confirm Email
    await client.query("UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1", [userId]);
    console.log('✅ Email Confirmed.');

    // 3. Insert Role
    await client.query("DELETE FROM public.user_roles WHERE user_id = $1", [userId]);
    await client.query(`
      INSERT INTO public.user_roles (user_id, role)
      VALUES ($1, 'store_owner')
    `, [userId]);
    console.log('✅ Role set to store_owner.');

    // 4. Insert Profile (if missing)
    const profCheck = await client.query("SELECT id FROM public.profiles WHERE user_id = $1", [userId]);
    if (profCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO public.profiles (user_id, full_name, phone)
          VALUES ($1, 'SecureForce Store Owner', '0555555555')
        `, [userId]);
        console.log('✅ Profile created.');
    } else {
        console.log('✅ Profile exists.');
    }

    // 5. Insert Store (if missing)
    const resStore = await client.query("SELECT id FROM public.stores WHERE owner_id = $1", [userId]);
    if (resStore.rows.length === 0) {
      await client.query(`
        INSERT INTO public.stores (owner_id, name, type, phone, status, is_active)
        VALUES ($1, 'SecureForce Market', 'Supermarket', '0555555555', 'pending', false)
      `, [userId]);
      console.log('✅ Store created (Pending).');
    } else {
      console.log('ℹ️ Store already exists.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixStore();
