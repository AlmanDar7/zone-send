import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { friendlySmtpError, sendSmtpMail } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
    if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "Unknown error";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    if (url.searchParams.get("action") === "unsubscribe") {
      const contactId = url.searchParams.get("contactId");
      if (contactId) {
        await supabase.from("contacts").update({ status: "Unsubscribed" }).eq("id", contactId);
        return new Response("<html><body><h1>You have been unsubscribed.</h1></body></html>", {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { to, subject, body, html, contactId, campaignId, stepNumber } = await req.json();
    if (!to || !subject || !body) {
      throw new Error("Missing required fields: to, subject, and body.");
    }

    const { data: smtp, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (smtpError) throw smtpError;
    if (!smtp) {
      throw new Error("SMTP settings not configured. Go to Settings to set up your email server.");
    }

    const isTestSend = !contactId && !campaignId;

    if (!isTestSend) {
      const { data: limits } = await supabase
        .from("sending_limits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (limits) {
        const today = new Date().toISOString().split("T")[0];
        if (limits.last_reset_date !== today) {
          await supabase
            .from("sending_limits")
            .update({ sent_today: 0, last_reset_date: today })
            .eq("user_id", user.id);
        } else if (limits.sent_today >= limits.max_per_day) {
          throw new Error(`Daily sending limit reached (${limits.max_per_day}). Try again tomorrow.`);
        }
      }
    }

    let queueId = "";
    if (contactId && campaignId) {
      const { data: queueEntry } = await supabase
        .from("email_queue")
        .select("id")
        .eq("contact_id", contactId)
        .eq("campaign_id", campaignId)
        .eq("step_number", stepNumber || 1)
        .maybeSingle();
      if (queueEntry) queueId = queueEntry.id;
    }

    const trackBase = `${supabaseUrl}/functions/v1/track-email`;
    const trackParams = `c=${contactId || ""}&ca=${campaignId || ""}&q=${queueId}&u=${user.id}`;
    const trackingPixel = contactId
      ? `<img src="${trackBase}?t=open&${trackParams}" width="1" height="1" style="display:none" alt="" />`
      : "";

    const wrapLinks = (htmlContent: string): string => {
      if (!contactId) return htmlContent;
      return htmlContent.replace(/href="(https?:\/\/[^"]+)"/g, (_match, linkUrl) => {
        const trackUrl = `${trackBase}?t=click&${trackParams}&l=${encodeURIComponent(linkUrl)}`;
        return `href="${trackUrl}"`;
      });
    };

    const unsubscribeUrl = contactId
      ? `${supabaseUrl}/functions/v1/send-email?action=unsubscribe&contactId=${contactId}`
      : "";
    const unsubscribePlain = unsubscribeUrl ? `\n\n---\nTo unsubscribe: ${unsubscribeUrl}` : "";
    const fullBody = `${body}${unsubscribePlain}`;

    let htmlBody =
      typeof html === "string" && html.trim()
        ? html
        : fullBody.replace(/\n/g, "<br>");
    htmlBody = wrapLinks(htmlBody);
    htmlBody += trackingPixel;

    try {
      await sendSmtpMail(smtp, {
        to,
        subject,
        content: fullBody,
        html: htmlBody,
      });
    } catch (smtpSendError: unknown) {
      const raw = smtpSendError instanceof Error ? smtpSendError.message : String(smtpSendError);
      throw new Error(friendlySmtpError(raw));
    }

    if (!isTestSend) {
      const { data: limits } = await supabase
        .from("sending_limits")
        .select("sent_today")
        .eq("user_id", user.id)
        .maybeSingle();

      if (limits) {
        await supabase
          .from("sending_limits")
          .update({ sent_today: (limits.sent_today || 0) + 1 })
          .eq("user_id", user.id);
      }
    }

    if (contactId && campaignId) {
      await supabase
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("contact_id", contactId)
        .eq("campaign_id", campaignId)
        .eq("step_number", stepNumber || 1);
    }

    return new Response(JSON.stringify({ success: true, message: "Email sent!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const status =
      message === "No authorization header" || message === "Unauthorized" ? 401 : 400;
    console.error("send-email error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
