const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Reusing the same verified connection string
const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

const migrationFile = path.join(__dirname, 'supabase/migrations/20251219150000_engagement_features.sql');

async function applyMigration() {
  console.log('--- APPLYING ENGAGEMENT SCHEMA (Favorites & Reviews) ---');
  const client = new Client(config);

  try {
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await client.connect();
    await client.query(sql);
    console.log('✅ Engagement schema applied successfully.');
  } catch (err) {
    console.log('❌ Error:', err.message);
    if (err.detail) console.log('Detail:', err.detail);
  } finally {
    await client.end();
  }
}

applyMigration();
