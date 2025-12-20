import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push helper functions
async function generateVAPIDKeys() {
  // Using a placeholder - in production, generate real VAPID keys
  return {
    publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY') || ''
  };
}

// Send push notification to a single subscription
async function sendPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: { title: string; body: string; icon?: string; data?: object }
): Promise<boolean> {
  try {
    // For now, we'll use a simple fetch to the push service
    // In production, use web-push library or similar
    console.log('Sending push notification to:', subscription.endpoint);
    console.log('Payload:', JSON.stringify(payload));
    
    // Note: Full Web Push implementation requires JWT signing with VAPID keys
    // This is a simplified version - for production, use a proper web-push library
    
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// Send push notifications to all user's subscriptions
async function sendPushToUser(
  supabase: any,
  userId: string,
  notification: { title: string; body: string; icon?: string; data?: object }
) {
  try {
    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return;
    }

    console.log(`Found ${subscriptions.length} push subscriptions for user`);

    // Send to all subscriptions
    for (const sub of subscriptions) {
      await sendPushNotification(sub, notification);
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

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

const defaultMessages: Record<string, string> = {
  pending: "تم استلام طلبك وسيتم مراجعته قريباً.",
  confirmed: "تم تأكيد طلبك وسيبدأ التحضير.",
  preparing: "طلبك قيد التحضير الآن.",
  ready: "✅ طلبك جاهز وسيتم تسليمه للمندوب قريباً!",
  out_for_delivery: "🚗 المندوب في طريقه إليك الآن!",
  picked_up: "🚗 المندوب في طريقه إليك الآن!",
  delivered: "🎉 تم توصيل طلبك بنجاح! نتمنى أن تكون راضياً عن الخدمة.",
  cancelled: "نأسف لإلغاء طلبك. نتمنى خدمتك مرة أخرى.",
  accepted: "تم قبول طلبك وسيبدأ التحضير قريباً.",
};

interface EmailTemplate {
  header_text: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  footer_text_en: string;
  subject_template: string;
  custom_message_pending: string | null;
  custom_message_confirmed: string | null;
  custom_message_preparing: string | null;
  custom_message_ready: string | null;
  custom_message_out_for_delivery: string | null;
  custom_message_delivered: string | null;
  custom_message_cancelled: string | null;
}

function buildEmailHtml(template: EmailTemplate, customerName: string, statusInfo: { ar: string }, shortOrderId: string, storeName: string, statusMessage: string, trackingPixelUrl?: string) {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, ${template.primary_color}, ${template.secondary_color}); color: white; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 25px; }
        .status-badge { display: inline-block; padding: 10px 20px; border-radius: 50px; font-weight: bold; font-size: 16px; margin: 15px 0; background: ${template.primary_color}22; color: ${template.primary_color}; }
        .order-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .order-info p { margin: 5px 0; color: #4b5563; }
        .status-message { text-align: center; padding: 15px; margin: 15px 0; background: #f0f9ff; border-radius: 8px; color: #1e40af; }
        .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .test-badge { background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 4px; font-size: 12px; margin-bottom: 15px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${template.header_text}</h1>
        </div>
        <div class="content">
          <p style="font-size: 18px; color: #1f2937;">مرحباً ${customerName}،</p>
          <p style="color: #4b5563;">تم تحديث حالة طلبك:</p>
          
          <div style="text-align: center;">
            <span class="status-badge">${statusInfo.ar}</span>
          </div>
          
          <div class="order-info">
            <p><strong>رقم الطلب:</strong> ${shortOrderId}</p>
            <p><strong>المتجر:</strong> ${storeName}</p>
            <p><strong>الحالة الجديدة:</strong> ${statusInfo.ar}</p>
          </div>
          
          ${statusMessage ? `<div class="status-message">${statusMessage}</div>` : ''}
        </div>
        <div class="footer">
          <p>${template.footer_text}</p>
          <p>${template.footer_text_en}</p>
        </div>
      </div>
      ${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />` : ''}
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send order notification");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Check if this is a test email request
    if (body.is_test) {
      console.log("Processing test email request");
      const { test_email, status, template: customTemplate } = body;

      if (!test_email) {
        return new Response(JSON.stringify({ error: "No test email provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const template: EmailTemplate = customTemplate || {
        header_text: "وصلني - Waslni",
        primary_color: "#3b82f6",
        secondary_color: "#1d4ed8",
        footer_text: "شكراً لاستخدامك وصلني",
        footer_text_en: "Thank you for using Waslni",
        subject_template: "تحديث طلبك #{order_id} - {status}",
        custom_message_pending: null,
        custom_message_confirmed: null,
        custom_message_preparing: null,
        custom_message_ready: null,
        custom_message_out_for_delivery: null,
        custom_message_delivered: null,
        custom_message_cancelled: null,
      };

      const statusInfo = statusLabels[status] || { ar: status, en: status };
      const shortOrderId = "TEST1234";
      const customerName = "مستخدم تجريبي";
      const storeName = "متجر تجريبي";

      const customMessageKey = `custom_message_${status}` as keyof EmailTemplate;
      const customMessage = template[customMessageKey] as string | null;
      const statusMessage = customMessage || defaultMessages[status] || "";

      const emailSubject = `[تجريبي] ${template.subject_template
        .replace('{order_id}', shortOrderId)
        .replace('{status}', statusInfo.ar)}`;

      const emailHtml = buildEmailHtml(template, customerName, statusInfo, shortOrderId, storeName, statusMessage);

      console.log(`Sending test email to ${test_email}`);

      const emailResponse = await resend.emails.send({
        from: "Waslni <onboarding@resend.dev>",
        to: [test_email],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log("Test email sent successfully:", emailResponse);

      // Log test email
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from("email_logs").insert({
        recipient_email: test_email,
        status: status,
        subject: emailSubject,
        is_test: true,
      });

      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Regular order notification flow
    const { order_id, new_status, customer_id, store_name } = body;

    console.log(`Processing notification for order ${order_id} - Status: ${new_status}`);

    if (!customer_id) {
      console.log("No customer_id provided, skipping notification");
      return new Response(JSON.stringify({ message: "No customer provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get email template
    const { data: templateData } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'order_status')
      .maybeSingle();

    const template: EmailTemplate = templateData || {
      header_text: "وصلني - Waslni",
      primary_color: "#3b82f6",
      secondary_color: "#1d4ed8",
      footer_text: "شكراً لاستخدامك وصلني",
      footer_text_en: "Thank you for using Waslni",
      subject_template: "تحديث طلبك #{order_id} - {status}",
      custom_message_pending: null,
      custom_message_confirmed: null,
      custom_message_preparing: null,
      custom_message_ready: null,
      custom_message_out_for_delivery: null,
      custom_message_delivered: null,
      custom_message_cancelled: null,
    };

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

    // Get custom message for this status or use default
    const customMessageKey = `custom_message_${new_status}` as keyof EmailTemplate;
    const customMessage = template[customMessageKey] as string | null;
    const statusMessage = customMessage || defaultMessages[new_status] || "";

    // Build email subject from template
    const emailSubject = template.subject_template
      .replace('{order_id}', shortOrderId)
      .replace('{status}', statusInfo.ar);

    // Generate tracking ID and URL
    const trackingId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;

    const emailHtml = buildEmailHtml(template, customerName, statusInfo, shortOrderId, store_name, statusMessage, trackingPixelUrl);

    const emailResponse = await resend.emails.send({
      from: "Waslni <onboarding@resend.dev>",
      to: [customerEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email in database
    await supabase.from("email_logs").insert({
      order_id: order_id,
      recipient_email: customerEmail,
      status: new_status,
      subject: emailSubject,
      tracking_id: trackingId,
      is_test: false,
    });

    // Send Push Notification
    const pushTitle = `تحديث طلبك #${shortOrderId}`;
    const pushBody = statusMessage || `حالة طلبك: ${statusInfo.ar}`;
    
    await sendPushToUser(supabase, customer_id, {
      title: pushTitle,
      body: pushBody,
      icon: '/favicon.ico',
      data: {
        url: `/order-tracking/${order_id}`,
        orderId: order_id,
        status: new_status
      }
    });

    console.log("Push notification sent to user:", customer_id);

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
