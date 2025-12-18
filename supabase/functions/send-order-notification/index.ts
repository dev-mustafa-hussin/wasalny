import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  pending: { ar: "قيد الانتظار", en: "Pending" },
  confirmed: { ar: "تم التأكيد", en: "Confirmed" },
  preparing: { ar: "جاري التحضير", en: "Preparing" },
  out_for_delivery: { ar: "في الطريق إليك", en: "Out for Delivery" },
  delivered: { ar: "تم التوصيل", en: "Delivered" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  accepted: { ar: "مقبول", en: "Accepted" },
  ready: { ar: "جاهز", en: "Ready" },
  picked_up: { ar: "في الطريق", en: "Picked Up" },
};

interface OrderNotificationRequest {
  order_id: string;
  new_status: string;
  customer_id: string;
  store_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send order notification");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, new_status, customer_id, store_name }: OrderNotificationRequest = await req.json();

    console.log(`Processing notification for order ${order_id} - Status: ${new_status}`);

    if (!customer_id) {
      console.log("No customer_id provided, skipping notification");
      return new Response(JSON.stringify({ message: "No customer provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Supabase client with service role to get user email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(customer_id);
    
    if (userError || !userData?.user?.email) {
      console.log("Could not get user email:", userError?.message);
      return new Response(JSON.stringify({ message: "Could not get user email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const customerEmail = userData.user.email;
    console.log(`Sending notification to ${customerEmail}`);

    // Get customer name from profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', customer_id)
      .maybeSingle();

    const customerName = profileData?.full_name || 'عزيزي العميل';
    const statusInfo = statusLabels[new_status] || { ar: new_status, en: new_status };
    const shortOrderId = order_id.slice(0, 8).toUpperCase();

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 25px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 25px; }
          .status-badge { display: inline-block; padding: 10px 20px; border-radius: 50px; font-weight: bold; font-size: 16px; margin: 15px 0; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-confirmed, .status-accepted { background: #d1fae5; color: #065f46; }
          .status-preparing { background: #e0e7ff; color: #3730a3; }
          .status-out_for_delivery, .status-picked_up { background: #dbeafe; color: #1e40af; }
          .status-delivered, .status-ready { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .order-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .order-info p { margin: 5px 0; color: #4b5563; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>وصلني - Waslni</h1>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #1f2937;">مرحباً ${customerName}،</p>
            <p style="color: #4b5563;">تم تحديث حالة طلبك:</p>
            
            <div style="text-align: center;">
              <span class="status-badge status-${new_status}">${statusInfo.ar}</span>
            </div>
            
            <div class="order-info">
              <p><strong>رقم الطلب:</strong> ${shortOrderId}</p>
              <p><strong>المتجر:</strong> ${store_name}</p>
              <p><strong>الحالة الجديدة:</strong> ${statusInfo.ar}</p>
            </div>
            
            ${new_status === 'delivered' ? `
              <p style="color: #065f46; text-align: center; font-weight: bold;">
                🎉 تم توصيل طلبك بنجاح! نتمنى أن تكون راضياً عن الخدمة.
              </p>
            ` : new_status === 'out_for_delivery' || new_status === 'picked_up' ? `
              <p style="color: #1e40af; text-align: center;">
                🚗 المندوب في طريقه إليك الآن!
              </p>
            ` : new_status === 'cancelled' ? `
              <p style="color: #991b1b; text-align: center;">
                نأسف لإلغاء طلبك. نتمنى خدمتك مرة أخرى.
              </p>
            ` : new_status === 'ready' ? `
              <p style="color: #065f46; text-align: center;">
                ✅ طلبك جاهز وسيتم تسليمه للمندوب قريباً!
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>شكراً لاستخدامك وصلني</p>
            <p>Thank you for using Waslni</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Waslni <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `تحديث طلبك #${shortOrderId} - ${statusInfo.ar}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
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
