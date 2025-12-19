const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function acceptAndDeliver() {
  console.log('--- AUTO-DRIVER SERVICE 🤖🏎️ ---');
  const client = new Client(config);

  try {
    await client.connect();

    // 1. Get Driver ID
    const driverRes = await client.query(`
      SELECT id FROM public.drivers 
      LIMIT 1
    `);
    const driverId = driverRes.rows[0].id;
    console.log(`Driver ID: ${driverId}`);

    // 2. Get Ready Order
    const orderRes = await client.query(`
      SELECT id FROM public.orders 
      WHERE status = 'ready'
      LIMIT 1
    `);

    if (orderRes.rows.length === 0) {
      console.log('No ready orders to pick up.');
      return;
    }

    const orderId = orderRes.rows[0].id;
    console.log(`Picking up Order: ${orderId}`);

    // 3. Accept & Start Delivery
    await client.query(`
      UPDATE public.orders
      SET driver_id = $1, status = 'out_for_delivery', updated_at = now()
      WHERE id = $2
    `, [driverId, orderId]);
    
    console.log('✅ Order Accepted & Out for Delivery!');

    // 4. Start Movement Simulation (inline here)
    console.log('📍 Starting GPS Simulation...');
    
    const route = [
      { lat: 30.0444, lng: 31.2357 }, // Tahrir (Start)
      { lat: 30.0400, lng: 31.2400 },
      { lat: 30.0350, lng: 31.2450 },
      { lat: 30.0300, lng: 31.2500 },
      { lat: 30.0250, lng: 31.2550 },
      { lat: 30.0200, lng: 31.2600 },
      { lat: 30.0100, lng: 31.2700 }, // Moving south
      { lat: 29.9800, lng: 31.3000 }, 
      { lat: 29.9602, lng: 31.2568 }, // Maadi
      { lat: 29.8500, lng: 31.3300 }  // Helwan (End)
    ];

    for (const point of route) {
      await client.query(`
        UPDATE public.drivers
        SET current_lat = $1, current_lng = $2, updated_at = now()
        WHERE id = $3
      `, [point.lat, point.lng, driverId]);
      
      console.log(`   -> Moved to ${point.lat}, ${point.lng}`);
      await new Promise(r => setTimeout(r, 2000)); // 2s delay
    }

    // 5. Mark Delivered
    await client.query(`
      UPDATE public.orders
      SET status = 'delivered', updated_at = now()
      WHERE id = $1
    `, [orderId]);
    console.log('✅ Order Delivered!');

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

acceptAndDeliver();
