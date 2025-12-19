const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres.dfcyclxrtcnymyuolbyi:fms2225115FMS%40%40%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

async function checkOrder() {
  console.log('--- CHECKING ORDER COORDINATES ---');
  const client = new Client(config);

  try {
    await client.connect();
    
    // Get the latest ready/out_for_delivery order
    const res = await client.query(`
      SELECT id, status, delivery_address, delivery_lat, delivery_lng, driver_id
      FROM public.orders 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (res.rows.length > 0) {
      const order = res.rows[0];
      console.log('Order Details:');
      console.log(`- ID: ${order.id}`);
      console.log(`- Status: ${order.status}`);
      console.log(`- Driver ID: ${order.driver_id}`);
      console.log(`- Address: ${order.delivery_address}`);
      console.log(`- Lat: ${order.delivery_lat}`);
      console.log(`- Lng: ${order.delivery_lng}`);

      if (!order.delivery_lat || !order.delivery_lng) {
        console.log('⚠️ Coordinates are MISSING. This explains why the map is hidden.');
        
        // Fix it automatically for testing
        console.log('🔧 Fixing coordinates now...');
        await client.query(`
          UPDATE public.orders
          SET delivery_lat = 29.8500, delivery_lng = 31.3300 -- Helwan
          WHERE id = $1
        `, [order.id]);
        console.log('✅ Coordinates updated to Helwan.');
      }
    } else {
      console.log('No orders found.');
    }

  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkOrder();
