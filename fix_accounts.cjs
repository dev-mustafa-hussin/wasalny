const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function fixAccounts() {
  console.log('--- APPLYING ACCOUNT FIXES ---');
  const client = new Client(config);

  try {
    await client.connect();

    // 1. Fix Admin
    console.log('🔧 Fixing Admin (dev-mustafa-hussin@hotmail.com)...');
    const adminUser = await client.query("SELECT id FROM auth.users WHERE email = 'dev-mustafa-hussin@hotmail.com'");
    
    if (adminUser.rows.length > 0) {
      const adminId = adminUser.rows[0].id;
      // Remove existing role if any just to be safe (or upsert)
      await client.query("DELETE FROM public.user_roles WHERE user_id = $1", [adminId]);
      // Insert Admin Role
      await client.query("INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')", [adminId]);
      console.log('   ✅ User promoted to ADMIN successfully.');
    } else {
      console.log('   ❌ Admin user not found in auth.users');
    }

    // 2. Fix Driver
    console.log('\n🔧 Fixing Driver (alarabiaforcosmetics@gmail.com)...');
    const driverUser = await client.query("SELECT id FROM auth.users WHERE email = 'alarabiaforcosmetics@gmail.com'");
    
    if (driverUser.rows.length > 0) {
      const driverId = driverUser.rows[0].id;
      
      // Fix Role
      await client.query("DELETE FROM public.user_roles WHERE user_id = $1", [driverId]);
      await client.query("INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'driver')", [driverId]);
      console.log('   ✅ User role set to DRIVER.');

      // Fix Profile (Table: drivers)
      // Check if exists first
      const existingDriver = await client.query("SELECT id FROM public.drivers WHERE user_id = $1", [driverId]);
      if (existingDriver.rows.length === 0) {
        await client.query(`
          INSERT INTO public.drivers (user_id, vehicle_type, vehicle_number, status, is_available)
          VALUES ($1, 'Car (Fixed)', 'FIX-1234', 'pending', false)
        `, [driverId]);
        console.log('   ✅ Driver profile created (Status: Pending).');
      } else {
        await client.query("UPDATE public.drivers SET status = 'pending' WHERE user_id = $1", [driverId]);
        console.log('   ✅ Existing driver profile reset to Pending.');
      }
    } else {
      console.log('   ❌ Driver user not found in auth.users');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('\n--- DONE ---');
  }
}

fixAccounts();
