const { Client } = require("pg");
const connectionString =
  "postgresql://postgres:fms2225115FMS%40%40%40@db.dfcyclxrtcnymyuolbyi.supabase.co:5432/postgres";

async function check() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    console.log("--- USER ROLES ---");
    const rolesRes = await client.query("SELECT * FROM user_roles");
    console.log(rolesRes.rows);

    console.log("\n--- STORES ---");
    const storesRes = await client.query("SELECT * FROM stores");
    console.log(storesRes.rows);

    console.log("\n--- APP_ROLE ENUM VALUES ---");
    const enumRes = await client.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'app_role'::regtype"
    );
    console.log(enumRes.rows.map((r) => r.enumlabel));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
