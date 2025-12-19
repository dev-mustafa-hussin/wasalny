const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function fixProfile() {
  console.log('--- FIXING PROFILE NAME ---');
  const client = new Client(config);

  try {
    await client.connect();

    const email = 'alarabiaforcosmetics@gmail.com';
    const name = 'Alarabia For Cosmetics';

    console.log(`Target: ${email}`);

    // Get User ID
    const resUser = await client.query("SELECT id FROM auth.users WHERE email = $1", [email]);
    if (resUser.rows.length === 0) {
      console.log('❌ User not found.');
      return;
    }
    const userId = resUser.rows[0].id;

    // Check/Insert Profile
    const resProfile = await client.query("SELECT id FROM public.profiles WHERE user_id = $1", [userId]);
    
    if (resProfile.rows.length === 0) {
      console.log('User has no profile. Creating one...');
      await client.query(`
        INSERT INTO public.profiles (user_id, full_name, phone)
        VALUES ($1, $2, '0500000000')
      `, [userId, name]);
      console.log('✅ Profile created successfully.');
    } else {
      console.log('User has profile. Updating name...');
      await client.query("UPDATE public.profiles SET full_name = $1 WHERE user_id = $2", [name, userId]);
      console.log('✅ Profile updated successfully.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixProfile();
