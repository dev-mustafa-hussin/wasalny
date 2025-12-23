const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected');
    
    // Add status column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'status') THEN
          ALTER TABLE stores ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
        END IF;
      END $$;
    `);
    console.log('Stores status checked/added');

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'status') THEN
          ALTER TABLE drivers ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
        END IF;
      END $$;
    `);
    console.log('Drivers status checked/added');

    // Ensure store_owner in enum
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE app_role ADD VALUE 'store_owner';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('Enum store_owner checked/added');

    // Apply the full migration
    const sql = fs.readFileSync('m:\\WEP\\Wasalny\\supabase\\migrations\\20251222_fix_admin_permissions.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
