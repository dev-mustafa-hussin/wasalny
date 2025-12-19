const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

// Route from Maadi (approx) to Helwan (approx)
const route = [
  { lat: 29.9602, lng: 31.2568 }, // Maadi Start
  { lat: 29.9550, lng: 31.2600 },
  { lat: 29.9500, lng: 31.2650 },
  { lat: 29.9450, lng: 31.2700 },
  { lat: 29.9400, lng: 31.2750 },
  { lat: 29.9350, lng: 31.2800 },
  { lat: 29.9300, lng: 31.2850 },
  { lat: 29.9250, lng: 31.2900 }, // Approaching Helwan
  { lat: 29.8500, lng: 31.3300 }  // Helwan
];

async function updateLocation(client, lat, lng) {
  // Update the driver's location (assuming we have one active driver for testing)
  // In a real scenario we'd target a specific driver ID
  await client.query(`
    UPDATE public.drivers
    SET current_lat = $1, current_lng = $2, updated_at = now()
    WHERE is_available = true
  `, [lat, lng]);
  console.log(`📍 Updated Location: ${lat}, ${lng}`);
}

async function simulate() {
  console.log('--- STARTING MOVEMENT SIMULATION 🚗💨 ---');
  const client = new Client(config);
  await client.connect();

  try {
    for (const point of route) {
      await updateLocation(client, point.lat, point.lng);
      // Wait 3 seconds between updates
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log('✅ Arrived at destination!');
  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

simulate();
