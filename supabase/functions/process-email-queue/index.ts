import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { campaignId } = await req.json().catch(() => ({}));

    // Get auth user if provided
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Get running campaigns
    let query = supabase.from("campaigns").select("*").eq("status", "Running");
    if (campaignId) query = query.eq("id", campaignId);
    if (userId) query = query.eq("user_id", userId);

    const { data: campaigns, error: campError } = await query;
    if (campError) throw campError;
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ message: "No running campaigns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalQueued = 0;

    for (const campaign of campaigns) {
      // Get campaign steps with templates
      const { data: steps } = await supabase
        .from("campaign_steps")
        .select("*, email_templates(*)")
        .eq("campaign_id", campaign.id)
        .order("step_number");

      if (!steps || steps.length === 0) continue;

      // Get active contacts for this campaign
      const { data: contacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "Active");

      if (!contacts || contacts.length === 0) continue;

      // Get sending limits
      const { data: limits } = await supabase
        .from("sending_limits")
        .select("*")
        .eq("user_id", campaign.user_id)
        .maybeSingle();

      const maxPerDay = limits?.max_per_day || 500;

      for (const contact of contacts) {
        // Check which steps already have queue entries
        const { data: existingQueue } = await supabase
          .from("email_queue")
          .select("step_number, status")
          .eq("contact_id", contact.id)
          .eq("campaign_id", campaign.id);

        const completedSteps = new Set((existingQueue || []).map((q) => q.step_number));

        for (const step of steps) {
          if (completedSteps.has(step.step_number)) continue;

          // Calculate scheduled time
          const baseDate = new Date(contact.date_added);
          baseDate.setDate(baseDate.getDate() + step.delay_days);

          // Only queue if scheduled time has passed or is within next processing window
          const now = new Date();
          if (baseDate <= now) {
            await supabase.from("email_queue").insert({
              user_id: campaign.user_id,
              contact_id: contact.id,
              campaign_id: campaign.id,
              step_number: step.step_number,
              scheduled_at: baseDate.toISOString(),
              status: "pending",
            });
            totalQueued++;
          }
          break; // Only queue the next pending step
        }
      }

      // Now process pending emails
      const { data: pendingEmails, error: pendingError } = await supabase
        .from("email_queue")
        .select("*, contacts(*)")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(maxPerDay);

      if (pendingError) {
        console.error("Failed to load pending emails:", pendingError.message);
        continue;
      }
      if (!pendingEmails || pendingEmails.length === 0) continue;

      // Get SMTP settings
      const { data: smtp } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("user_id", campaign.user_id)
        .single();

      if (!smtp) continue;

      for (const email of pendingEmails) {
        const contact = email.contacts as any;
        const stepConfig = steps.find((s: any) => s.step_number === email.step_number);
        const template = (stepConfig as any)?.email_templates;

        if (!template || !contact) continue;

        // Replace variables
        let subject = template.subject
          .replace(/\{\{FirstName\}\}/g, contact.name.split(" ")[0])
          .replace(/\{\{Email\}\}/g, contact.email)
          .replace(/\{\{CompanyName\}\}/g, contact.company_name || "");

        let body = template.body
          .replace(/\{\{FirstName\}\}/g, contact.name.split(" ")[0])
          .replace(/\{\{Email\}\}/g, contact.email)
          .replace(/\{\{CompanyName\}\}/g, contact.company_name || "");

        // Try to send via the send-email function internally
        try {
          const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
          const client = new SMTPClient({
            connection: {
              hostname: smtp.host,
              port: smtp.port,
              tls: smtp.use_ssl,
              auth: { username: smtp.username, password: smtp.password },
            },
          });

          const unsubUrl = `${supabaseUrl}/functions/v1/send-email?action=unsubscribe&contactId=${contact.id}`;
          const fullBody = `${body}\n\n---\nTo unsubscribe: ${unsubUrl}`;

          await client.send({
            from: smtp.from_email || smtp.username,
            to: contact.email,
            subject,
            content: fullBody,
            html: fullBody.replace(/\n/g, "<br>"),
          });
          await client.close();

          await supabase.from("email_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", email.id);

          // Update sending count
          if (limits) {
            await supabase.from("sending_limits").update({ sent_today: (limits.sent_today || 0) + 1 }).eq("user_id", campaign.user_id);
          }
        } catch (sendError: any) {
          console.error(`Failed to send to ${contact.email}:`, sendError.message);
          await supabase.from("email_queue").update({ status: "failed", error_message: sendError.message }).eq("id", email.id);

          // Check if bounce
          if (sendError.message.includes("550") || sendError.message.includes("bounce") || sendError.message.includes("invalid")) {
            await supabase.from("contacts").update({ status: "Bounced", bounce_reason: sendError.message }).eq("id", contact.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, queued: totalQueued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Queue processing error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
