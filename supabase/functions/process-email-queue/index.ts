import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isBusinessHours(timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(now), 10);
    return hour >= 9 && hour < 18;
  } catch {
    return true;
  }
}

function shouldEnforceBusinessHours(timezone?: string | null): boolean {
  if (!timezone) return false;
  return timezone.trim().length > 0 && timezone !== "UTC";
}

function pickVariant(step: any, existingSentA: number, existingSentB: number): "a" | "b" {
  if (step.winning_variant === "a" || step.winning_variant === "b") {
    return step.winning_variant;
  }

  return existingSentA <= existingSentB ? "a" : "b";
}

function getStepDelayMs(step: any): number {
  const delayValue = Number.isFinite(step?.delay_value)
    ? Number(step.delay_value)
    : Number(step?.delay_days || 0);
  const safeDelayValue = Math.max(0, delayValue);
  const delayUnit = step?.delay_unit === "hours" ? "hours" : "days";
  const unitMs = delayUnit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return safeDelayValue * unitMs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const campaignId = body?.campaignId;

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: authData } = await supabase.auth.getUser(token);
      userId = authData.user?.id ?? null;
    }

    let campaignQuery = supabase.from("campaigns").select("*").eq("status", "Running");
    if (campaignId) campaignQuery = campaignQuery.eq("id", campaignId);
    if (userId) campaignQuery = campaignQuery.eq("user_id", userId);

    const { data: campaigns, error: campaignError } = await campaignQuery;
    if (campaignError) throw campaignError;

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ success: true, queued: 0, processed: 0, message: "No running campaigns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalQueued = 0;
    let totalProcessed = 0;

    for (const campaign of campaigns) {
      const [{ data: steps, error: stepsError }, { data: contacts, error: contactsError }, { data: limits, error: limitsError }] = await Promise.all([
        supabase
          .from("campaign_steps")
          .select("*, email_templates(*)")
          .eq("campaign_id", campaign.id)
          .order("step_number"),
        supabase
          .from("contacts")
          .select("*")
          .eq("campaign_id", campaign.id)
          .eq("status", "Active"),
        supabase
          .from("sending_limits")
          .select("*")
          .eq("user_id", campaign.user_id)
          .maybeSingle(),
      ]);

      if (stepsError) throw stepsError;
      if (contactsError) throw contactsError;
      if (limitsError) throw limitsError;
      if (!steps?.length || !contacts?.length) continue;

      const maxPerDay = limits?.max_per_day || 500;

      for (const contact of contacts) {
        const { data: existingQueue, error: queueLookupError } = await supabase
          .from("email_queue")
          .select("step_number, status")
          .eq("contact_id", contact.id)
          .eq("campaign_id", campaign.id);

        if (queueLookupError) throw queueLookupError;

        const completedSteps = new Set(
          (existingQueue || [])
            .filter((entry: any) => entry.status !== "failed")
            .map((entry: any) => entry.step_number),
        );

        for (const step of steps) {
          if (completedSteps.has(step.step_number)) continue;

          const scheduledDate = new Date(contact.date_added);
          scheduledDate.setTime(scheduledDate.getTime() + getStepDelayMs(step));

          if (scheduledDate <= new Date()) {
            let variant: string | null = null;

            if ((step as any).ab_test_enabled) {
              const [{ count: countA }, { count: countB }] = await Promise.all([
                supabase
                  .from("email_queue")
                  .select("*", { count: "exact", head: true })
                  .eq("campaign_id", campaign.id)
                  .eq("step_number", step.step_number)
                  .eq("variant", "a"),
                supabase
                  .from("email_queue")
                  .select("*", { count: "exact", head: true })
                  .eq("campaign_id", campaign.id)
                  .eq("step_number", step.step_number)
                  .eq("variant", "b"),
              ]);

              variant = pickVariant(step, countA || 0, countB || 0);
            }

            const { error: insertQueueError } = await supabase.from("email_queue").insert({
              user_id: campaign.user_id,
              contact_id: contact.id,
              campaign_id: campaign.id,
              step_number: step.step_number,
              scheduled_at: scheduledDate.toISOString(),
              status: "pending",
              variant,
            });

            if (insertQueueError) throw insertQueueError;
            totalQueued += 1;
          }

          break;
        }
      }

      const { data: pendingEmails, error: pendingError } = await supabase
        .from("email_queue")
        .select("*, contacts(*)")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(maxPerDay);

      if (pendingError) throw pendingError;
      if (!pendingEmails?.length) continue;

      const { data: smtp, error: smtpError } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("user_id", campaign.user_id)
        .single();

      if (smtpError || !smtp) {
        console.error(`Missing SMTP settings for user ${campaign.user_id}`);
        continue;
      }

      for (const email of pendingEmails) {
        const contact = email.contacts as any;
        const stepConfig = steps.find((step: any) => step.step_number === email.step_number);
        const template = (stepConfig as any)?.email_templates;

        if (!template || !contact) {
          console.error(`Skipping queue ${email.id}: missing template or contact`);
          continue;
        }

        const contactTimezone = contact.timezone || null;
        if (shouldEnforceBusinessHours(contactTimezone) && !isBusinessHours(contactTimezone)) {
          continue;
        }

        let rawSubject = template.subject;
        let rawBody = template.body;
        let rawHtmlBody: string | null = (template as any).html_body || null;

        if ((stepConfig as any).ab_test_enabled && (email as any).variant) {
          const variant = (email as any).variant;
          if (variant === "a" && (stepConfig as any).subject_a) rawSubject = (stepConfig as any).subject_a;
          if (variant === "a" && (stepConfig as any).body_a) rawBody = (stepConfig as any).body_a;
          if (variant === "b" && (stepConfig as any).subject_b) rawSubject = (stepConfig as any).subject_b;
          if (variant === "b" && (stepConfig as any).body_b) rawBody = (stepConfig as any).body_b;
        }

        const firstName = contact.name?.split(" ")[0] || "there";
        const replaceVars = (value: string) =>
          value
            .replace(/\{\{FirstName\}\}/g, firstName)
            .replace(/\{\{Email\}\}/g, contact.email)
            .replace(/\{\{CompanyName\}\}/g, contact.company_name || "");

        const subject = replaceVars(rawSubject);
        const bodyText = replaceVars(rawBody);
        const bodyHtml = rawHtmlBody ? replaceVars(rawHtmlBody) : null;

        const trackBase = `${supabaseUrl}/functions/v1/track-email`;
        const trackParams = `c=${contact.id}&ca=${campaign.id}&q=${email.id}&u=${campaign.user_id}`;
        const trackingPixel = `<img src="${trackBase}?t=open&${trackParams}" width="1" height="1" style="display:none" alt="" />`;
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/send-email?action=unsubscribe&contactId=${contact.id}`;
        const fullBody = `${bodyText}\n\n---\nTo unsubscribe: ${unsubscribeUrl}`;
        const wrapClickTracking = (html: string) =>
          html.replace(/href="(https?:\/\/[^\"]+)"/g, (_match: string, url: string) => {
            const trackedUrl = `${trackBase}?t=click&${trackParams}&l=${encodeURIComponent(url)}`;
            return `href="${trackedUrl}"`;
          });

        const unsubscribeHtml = bodyHtml
          ? `<div style="margin-top:24px;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#64748b;">To unsubscribe, <a href="${unsubscribeUrl}">click here</a>.</div>`
          : "";
        const htmlBody = bodyHtml
          ? `${wrapClickTracking(bodyHtml)}${unsubscribeHtml}${trackingPixel}`
          : `${wrapClickTracking(fullBody.replace(/\n/g, "<br>"))}${trackingPixel}`;

        try {
          const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
          const client = new SMTPClient({
            connection: {
              hostname: smtp.host,
              port: smtp.port,
              tls: smtp.use_ssl,
              auth: {
                username: smtp.username,
                password: smtp.password,
              },
            },
          });

          await client.send({
            from: smtp.from_name
              ? `${smtp.from_name} <${smtp.from_email || smtp.username}>`
              : (smtp.from_email || smtp.username),
            to: contact.email,
            subject,
            content: fullBody,
            html: htmlBody,
          });

          await client.close();

          const { error: sentUpdateError } = await supabase
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
            .eq("id", email.id);

          if (sentUpdateError) throw sentUpdateError;
          totalProcessed += 1;

          if (limits) {
            await supabase
              .from("sending_limits")
              .update({ sent_today: (limits.sent_today || 0) + 1 })
              .eq("user_id", campaign.user_id);
          }
        } catch (sendError: any) {
          console.error(`Failed to send queue ${email.id} to ${contact.email}:`, sendError?.message || sendError);

          await supabase
            .from("email_queue")
            .update({ status: "failed", error_message: sendError?.message || "Unknown send error" })
            .eq("id", email.id);

          const errorText = String(sendError?.message || "").toLowerCase();
          if (errorText.includes("550") || errorText.includes("bounce") || errorText.includes("invalid")) {
            await supabase
              .from("contacts")
              .update({ status: "Bounced", bounce_reason: sendError?.message || "Bounce detected" })
              .eq("id", contact.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, queued: totalQueued, processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Queue processing error:", error?.message || error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});