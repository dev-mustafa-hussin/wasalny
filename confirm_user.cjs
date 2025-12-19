const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function confirmUser() {
  console.log('--- CONFIRMING USER EMAIL ---');
  const client = new Client(config);

  try {
    await client.connect();

    const email = 'alarabiaforcosmetics@gmail.com';
    console.log(`Target: ${email}`);

    const res = await client.query(`
      UPDATE auth.users
      SET email_confirmed_at = now()
      WHERE email = $1
      RETURNING id, email, email_confirmed_at
    `, [email]);

    if (res.rowCount > 0) {
      console.log('✅ SUCCESS: Email marked as confirmed.');
      console.log(`   User ID: ${res.rows[0].id}`);
      console.log(`   Confirmed At: ${res.rows[0].email_confirmed_at}`);
    } else {
      console.log('❌ Error: User not found.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

confirmUser();
