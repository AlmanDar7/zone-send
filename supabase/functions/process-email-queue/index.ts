import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Check if it's currently business hours (9 AM - 6 PM) in a given timezone
function isBusinessHours(timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(now));
    return hour >= 9 && hour < 18;
  } catch {
    return true; // Default to allowing if timezone is invalid
  }
}

// Pick A/B variant: 50/50 split, or use winner if determined
function pickVariant(step: any, existingSentA: number, existingSentB: number): "a" | "b" {
  if (step.winning_variant) return step.winning_variant;
  // 50/50 by count
  return existingSentA <= existingSentB ? "a" : "b";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const campaignId = body?.campaignId;

    // Auth is optional - cron calls without auth, UI calls with auth
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

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
      const { data: steps } = await supabase
        .from("campaign_steps")
        .select("*, email_templates(*)")
        .eq("campaign_id", campaign.id)
        .order("step_number");

      if (!steps || steps.length === 0) continue;

      const { data: contacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "Active");

      if (!contacts || contacts.length === 0) continue;

      const { data: limits } = await supabase
        .from("sending_limits")
        .select("*")
        .eq("user_id", campaign.user_id)
        .maybeSingle();

      const maxPerDay = limits?.max_per_day || 500;

      for (const contact of contacts) {
        // Timezone scheduling: skip if not business hours in contact's timezone
        const contactTimezone = (contact as any).timezone || "UTC";
        if (!isBusinessHours(contactTimezone)) continue;

        const { data: existingQueue } = await supabase
          .from("email_queue")
          .select("step_number, status")
          .eq("contact_id", contact.id)
          .eq("campaign_id", campaign.id);

        const completedSteps = new Set((existingQueue || []).map((q: any) => q.step_number));

        for (const step of steps) {
          if (completedSteps.has(step.step_number)) continue;

          const baseDate = new Date(contact.date_added);
          baseDate.setDate(baseDate.getDate() + step.delay_days);

          const now = new Date();
          if (baseDate <= now) {
            // Determine A/B variant if enabled
            let variant: string | null = null;
            if ((step as any).ab_test_enabled) {
              const { count: countA } = await supabase
                .from("email_queue")
                .select("*", { count: "exact", head: true })
                .eq("campaign_id", campaign.id)
                .eq("step_number", step.step_number)
                .eq("variant", "a");
              const { count: countB } = await supabase
                .from("email_queue")
                .select("*", { count: "exact", head: true })
                .eq("campaign_id", campaign.id)
                .eq("step_number", step.step_number)
                .eq("variant", "b");
              variant = pickVariant(step, countA || 0, countB || 0);
            }

            await supabase.from("email_queue").insert({
              user_id: campaign.user_id,
              contact_id: contact.id,
              campaign_id: campaign.id,
              step_number: step.step_number,
              scheduled_at: baseDate.toISOString(),
              status: "pending",
              variant,
            });
            totalQueued++;
          }
          break;
        }
      }

      // Process pending emails
      const { data: pendingEmails, error: pendingError } = await supabase
        .from("email_queue")
        .select("*, contacts(*)")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(maxPerDay);

      if (pendingError || !pendingEmails || pendingEmails.length === 0) continue;

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

        // Determine subject and body (A/B or default)
        let rawSubject = template.subject;
        let rawBody = template.body;

        if ((stepConfig as any).ab_test_enabled && (email as any).variant) {
          const v = (email as any).variant;
          if (v === "a" && (stepConfig as any).subject_a) rawSubject = (stepConfig as any).subject_a;
          if (v === "a" && (stepConfig as any).body_a) rawBody = (stepConfig as any).body_a;
          if (v === "b" && (stepConfig as any).subject_b) rawSubject = (stepConfig as any).subject_b;
          if (v === "b" && (stepConfig as any).body_b) rawBody = (stepConfig as any).body_b;
        }

        // Replace variables
        let subject = rawSubject
          .replace(/\{\{FirstName\}\}/g, contact.name.split(" ")[0])
          .replace(/\{\{Email\}\}/g, contact.email)
          .replace(/\{\{CompanyName\}\}/g, contact.company_name || "");

        let body = rawBody
          .replace(/\{\{FirstName\}\}/g, contact.name.split(" ")[0])
          .replace(/\{\{Email\}\}/g, contact.email)
          .replace(/\{\{CompanyName\}\}/g, contact.company_name || "");

        // Build tracking
        const trackBase = `${supabaseUrl}/functions/v1/track-email`;
        const trackParams = `c=${contact.id}&ca=${campaign.id}&q=${email.id}&u=${campaign.user_id}`;
        const trackingPixel = `<img src="${trackBase}?t=open&${trackParams}" width="1" height="1" style="display:none" alt="" />`;

        const wrapLinks = (html: string): string => {
          return html.replace(/href="(https?:\/\/[^"]+)"/g, (_match: string, url: string) => {
            const trackUrl = `${trackBase}?t=click&${trackParams}&l=${encodeURIComponent(url)}`;
            return `href="${trackUrl}"`;
          });
        };

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
          let htmlBody = fullBody.replace(/\n/g, "<br>");
          htmlBody = wrapLinks(htmlBody);
          htmlBody += trackingPixel;

          await client.send({
            from: smtp.from_email || smtp.username,
            to: contact.email,
            subject,
            content: fullBody,
            html: htmlBody,
          });
          await client.close();

          await supabase.from("email_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", email.id);

          // Fire webhook for email.sent
          fetch(`${supabaseUrl}/functions/v1/fire-webhooks`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              event_type: "email.sent",
              user_id: campaign.user_id,
              payload: { contact_id: contact.id, campaign_id: campaign.id, email: contact.email, subject, variant: (email as any).variant },
            }),
          }).catch(() => {});

          if (limits) {
            await supabase.from("sending_limits").update({ sent_today: (limits.sent_today || 0) + 1 }).eq("user_id", campaign.user_id);
          }

          // A/B test: auto-select winner after 50 sends per variant
          if ((stepConfig as any).ab_test_enabled && !(stepConfig as any).winning_variant) {
            const { count: totalA } = await supabase.from("email_queue").select("*", { count: "exact", head: true })
              .eq("campaign_id", campaign.id).eq("step_number", email.step_number).eq("variant", "a").eq("status", "sent");
            const { count: totalB } = await supabase.from("email_queue").select("*", { count: "exact", head: true })
              .eq("campaign_id", campaign.id).eq("step_number", email.step_number).eq("variant", "b").eq("status", "sent");

            if ((totalA || 0) >= 25 && (totalB || 0) >= 25) {
              // Count opens per variant
              const { count: opensA } = await supabase.from("email_events").select("*", { count: "exact", head: true })
                .eq("campaign_id", campaign.id).eq("event_type", "open")
                .in("email_queue_id", (await supabase.from("email_queue").select("id").eq("campaign_id", campaign.id).eq("step_number", email.step_number).eq("variant", "a")).data?.map((r: any) => r.id) || []);
              const { count: opensB } = await supabase.from("email_events").select("*", { count: "exact", head: true })
                .eq("campaign_id", campaign.id).eq("event_type", "open")
                .in("email_queue_id", (await supabase.from("email_queue").select("id").eq("campaign_id", campaign.id).eq("step_number", email.step_number).eq("variant", "b")).data?.map((r: any) => r.id) || []);

              const rateA = (opensA || 0) / (totalA || 1);
              const rateB = (opensB || 0) / (totalB || 1);
              const winner = rateA >= rateB ? "a" : "b";

              await supabase.from("campaign_steps").update({ winning_variant: winner }).eq("id", stepConfig.id);
            }
          }
        } catch (sendError: any) {
          console.error(`Failed to send to ${contact.email}:`, sendError.message);
          await supabase.from("email_queue").update({ status: "failed", error_message: sendError.message }).eq("id", email.id);

          if (sendError.message.includes("550") || sendError.message.includes("bounce") || sendError.message.includes("invalid")) {
            await supabase.from("contacts").update({ status: "Bounced", bounce_reason: sendError.message }).eq("id", contact.id);

            // Fire webhook for bounce
            fetch(`${supabaseUrl}/functions/v1/fire-webhooks`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                event_type: "email.bounced",
                user_id: campaign.user_id,
                payload: { contact_id: contact.id, campaign_id: campaign.id, email: contact.email, reason: sendError.message },
              }),
            }).catch(() => {});
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
