import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to notify driver about new order");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, driver_id } = await req.json();

    console.log(`Processing driver notification for order ${order_id}, driver ${driver_id}`);

    if (!driver_id) {
      console.log("No driver_id provided, skipping notification");
      return new Response(JSON.stringify({ message: "No driver provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get driver user_id
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('id', driver_id)
      .maybeSingle();

    if (driverError || !driver) {
      console.log("Could not find driver:", driverError?.message);
      return new Response(JSON.stringify({ message: "Driver not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        delivery_address,
        delivery_fee,
        total_amount,
        stores (name)
      `)
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      console.log("Could not find order:", orderError?.message);
      return new Response(JSON.stringify({ message: "Order not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const shortOrderId = order_id.slice(0, 8).toUpperCase();
    const storeName = (order.stores as any)?.name || 'متجر';

    // Get all push subscriptions for this driver
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', driver.user_id);

    if (subError) {
      console.error('Error fetching push subscriptions:', subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for driver:', driver.user_id);
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${subscriptions.length} push subscriptions for driver`);

    // Prepare notification payload
    const notification = {
      title: `🔔 طلب جديد #${shortOrderId}`,
      body: `طلب جديد من ${storeName} - ${order.delivery_fee} ر.س`,
      icon: '/favicon.ico',
      data: {
        url: '/driver',
        orderId: order_id,
        type: 'new_order'
      }
    };

    // Send to all subscriptions
    // Note: Full Web Push implementation requires VAPID keys and proper signing
    // This logs the notification for now - full implementation needs web-push library
    for (const sub of subscriptions) {
      console.log('Would send push to:', sub.endpoint);
      console.log('Notification payload:', JSON.stringify(notification));
    }

    console.log("Driver notification processed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification processed",
      subscriptionsCount: subscriptions.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending driver notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
