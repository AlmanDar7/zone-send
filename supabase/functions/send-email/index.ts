import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { to, subject, body, contactId, campaignId, stepNumber } = await req.json();

    // Get SMTP settings
    const { data: smtp, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (smtpError || !smtp) throw new Error("SMTP settings not configured. Go to Settings to set up your email server.");

    // Check sending limits
    const { data: limits } = await supabase
      .from("sending_limits")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (limits) {
      const today = new Date().toISOString().split("T")[0];
      if (limits.last_reset_date !== today) {
        await supabase.from("sending_limits").update({ sent_today: 0, last_reset_date: today }).eq("user_id", user.id);
      } else if (limits.sent_today >= limits.max_per_day) {
        throw new Error(`Daily sending limit reached (${limits.max_per_day}). Email queued for tomorrow.`);
      }
    }

    // Send email via SMTP
    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port,
        tls: smtp.use_ssl,
        auth: { username: smtp.username, password: smtp.password },
      },
    });

    // Add unsubscribe link
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/send-email?action=unsubscribe&contactId=${contactId}`;
    const fullBody = `${body}\n\n---\nTo unsubscribe from future emails, click here: ${unsubscribeUrl}`;

    await client.send({
      from: smtp.from_email || smtp.username,
      to: to,
      subject: subject,
      content: fullBody,
      html: fullBody.replace(/\n/g, "<br>"),
    });

    await client.close();

    // Update sending count
    if (limits) {
      await supabase.from("sending_limits").update({ sent_today: limits.sent_today + 1 }).eq("user_id", user.id);
    }

    // Update email queue status if applicable
    if (contactId && campaignId) {
      await supabase
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("contact_id", contactId)
        .eq("campaign_id", campaignId)
        .eq("step_number", stepNumber || 1);
    }

    return new Response(JSON.stringify({ success: true, message: "Email sent!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    // Handle unsubscribe
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "unsubscribe") {
      const contactId = url.searchParams.get("contactId");
      if (contactId) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase.from("contacts").update({ status: "Unsubscribed" }).eq("id", contactId);
        return new Response("<html><body><h1>You have been unsubscribed.</h1></body></html>", {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    console.error("Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
